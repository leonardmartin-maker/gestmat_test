import re
import secrets
from datetime import datetime, date, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.company import Company
from app.models.user import User
from app.models.employee import Employee
from app.models.asset import Asset
from app.models.event import Event
from app.models.incident import Incident
from app.models.epi_category import EpiCategory
from app.models.maintenance_task import MaintenanceTask
from app.models.subscription import Plan, Subscription
from app.schemas.auth import RegisterIn, LoginIn, TokenOut

router = APIRouter()


def _slugify(name: str) -> str:
    """Create URL-safe slug from company name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:80] or "company"


@router.post("/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email deja utilise")

    # Check company name not taken
    if db.query(Company).filter(Company.name == payload.company_name).first():
        raise HTTPException(status_code=400, detail="Ce nom d'entreprise est deja pris")

    # Create company
    slug = _slugify(payload.company_name)
    # Ensure slug uniqueness
    base_slug = slug
    counter = 1
    while db.query(Company).filter(Company.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    company = Company(
        name=payload.company_name,
        slug=slug,
        contact_email=payload.email,
    )
    db.add(company)
    try:
        db.commit()
        db.refresh(company)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erreur creation societe")

    # Create admin user
    user = User(
        company_id=company.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="ADMIN",
    )
    db.add(user)

    # Create TRIAL subscription
    trial_plan = db.query(Plan).filter(Plan.code == "TRIAL").first()
    if trial_plan:
        sub = Subscription(
            company_id=company.id,
            plan_id=trial_plan.id,
            status="TRIAL",
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=trial_plan.trial_days or 14),
        )
        db.add(sub)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email deja utilise")

    token = create_access_token(
        subject=str(user.id),
        extra={"cid": user.company_id, "role": user.role},
    )
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=401, detail="Ce compte a ete desactive")

    token = create_access_token(
        subject=str(user.id),
        extra={"cid": user.company_id, "role": user.role},
    )
    return TokenOut(access_token=token)


# ---------------------------------------------------------------------------
#  DEMO MODE — creates a temporary company with realistic sample data
# ---------------------------------------------------------------------------

def _seed_demo_data(db: Session, company_id: int):
    """Seed a demo company with realistic Swiss delivery company data."""

    # --- Employees ---
    employees = []
    employee_data = [
        ("Lucas", "Müller", "LM001", "lucas.muller@demo.gestmat.ch"),
        ("Sophie", "Dubois", "SD002", "sophie.dubois@demo.gestmat.ch"),
        ("Marco", "Rossi", "MR003", "marco.rossi@demo.gestmat.ch"),
        ("Emma", "Weber", "EW004", "emma.weber@demo.gestmat.ch"),
        ("Noah", "Bernasconi", "NB005", "noah.bernasconi@demo.gestmat.ch"),
    ]
    for fn, ln, code, email in employee_data:
        emp = Employee(
            company_id=company_id,
            first_name=fn,
            last_name=ln,
            employee_code=code,
            email=email,
            active=True,
        )
        db.add(emp)
        employees.append(emp)
    db.flush()

    # --- EPI Categories ---
    cat_casque = EpiCategory(company_id=company_id, name="Casques", icon="🪖", enabled_attributes=["taille"])
    cat_gilet = EpiCategory(company_id=company_id, name="Gilets haute visibilite", icon="🦺", enabled_attributes=["taille"])
    cat_gants = EpiCategory(company_id=company_id, name="Gants", icon="🧤", enabled_attributes=["taille"])
    db.add_all([cat_casque, cat_gilet, cat_gants])
    db.flush()

    # --- Vehicles ---
    vehicles = []
    vehicle_data = [
        ("Honda PCX 125", "VD-123456", "Honda PCX 125", 12450),
        ("Yamaha NMAX 125", "GE-789012", "Yamaha NMAX 125", 8320),
        ("Renault Kangoo E-Tech", "VD-345678", "Renault Kangoo E-Tech", 23100),
        ("Peugeot e-Partner", "VS-901234", "Peugeot e-Partner", 15700),
        ("Honda SH 125", "GE-567890", "Honda SH 125", 5200),
    ]
    for name, plate, model, km in vehicle_data:
        v = Asset(
            company_id=company_id,
            category="VEHICLE",
            name=name,
            plate=plate,
            model_name=model,
            km_current=km,
            status="AVAILABLE",
            insurance_date=date(2026, 12, 31),
            inspection_date=date(2026, 9, 15),
        )
        db.add(v)
        vehicles.append(v)
    db.flush()

    # Assign 2 vehicles
    vehicles[0].status = "ASSIGNED"
    vehicles[2].status = "ASSIGNED"

    # --- EPIs ---
    epis = []
    epi_data = [
        ("Casque Shoei J-Cruise II", cat_casque.id, "SN-CSQ-001"),
        ("Casque HJC i30", cat_casque.id, "SN-CSQ-002"),
        ("Gilet Portwest C470", cat_gilet.id, "SN-GIL-001"),
        ("Gilet 3M Scotchlite", cat_gilet.id, "SN-GIL-002"),
        ("Gants Mechanix M-Pact", cat_gants.id, "SN-GNT-001"),
        ("Gants Uvex Phynomic", cat_gants.id, "SN-GNT-002"),
    ]
    for name, cat_id, sn in epi_data:
        e = Asset(
            company_id=company_id,
            category="EPI",
            name=name,
            epi_category_id=cat_id,
            serial_number=sn,
            status="AVAILABLE",
            next_inspection_date=date(2026, 6, 30),
        )
        db.add(e)
        epis.append(e)
    db.flush()

    # Assign some EPIs
    epis[0].status = "ASSIGNED"
    epis[2].status = "ASSIGNED"

    # --- Events (recent activity) ---
    now = datetime.now(timezone.utc)
    events_data = [
        # Lucas took Honda PCX 3 days ago
        (vehicles[0].id, employees[0].id, "CHECK_OUT", now - timedelta(days=3), 12400, "Prise pour tournee Lausanne"),
        # Sophie returned Yamaha yesterday
        (vehicles[1].id, employees[1].id, "CHECK_IN", now - timedelta(days=1), 8320, "Retour fin de journee"),
        # Sophie took Yamaha 3 days ago
        (vehicles[1].id, employees[1].id, "CHECK_OUT", now - timedelta(days=3), 8250, "Tournee Geneve centre"),
        # Marco took Kangoo 2 days ago
        (vehicles[2].id, employees[2].id, "CHECK_OUT", now - timedelta(days=2), 23050, "Livraisons Valais"),
        # Emma took casque + gilet today
        (epis[0].id, employees[3].id, "CHECK_OUT", now - timedelta(hours=6), None, "EPI pour tournee"),
        (epis[2].id, employees[3].id, "CHECK_OUT", now - timedelta(hours=6), None, "EPI pour tournee"),
    ]
    for asset_id, emp_id, etype, occurred, km, notes in events_data:
        ev = Event(
            company_id=company_id,
            asset_id=asset_id,
            employee_id=emp_id,
            event_type=etype,
            occurred_at=occurred,
            km_value=km,
            notes=notes,
        )
        db.add(ev)

    # --- Incidents ---
    incident = Incident(
        company_id=company_id,
        employee_id=employees[1].id,
        asset_id=vehicles[1].id,
        incident_type="ACCIDENT",
        description="Accrochage mineur sur le retour. Retroviseur droit casse, carrosserie eraflee cote passager.",
        location="Rue du Mont-Blanc 12, Geneve",
        has_third_party=True,
        third_party_name="Jean Dupont",
        third_party_plate="GE-112233",
        third_party_insurance="Mobiliere #456789",
        third_party_phone="+41 79 123 45 67",
        status="PENDING",
    )
    db.add(incident)

    incident2 = Incident(
        company_id=company_id,
        employee_id=employees[2].id,
        asset_id=vehicles[2].id,
        incident_type="BREAKDOWN",
        description="Voyant moteur allume, perte de puissance sur autoroute A9.",
        location="Autoroute A9, sortie Martigny",
        has_third_party=False,
        status="IN_PROGRESS",
    )
    db.add(incident2)

    # --- Maintenance tasks ---
    maint_data = [
        (vehicles[0].id, "Vidange huile moteur", 5000, 180, date(2026, 4, 5), 13000),
        (vehicles[0].id, "Revision courroie", 20000, 365, date(2027, 3, 1), 30000),
        (vehicles[2].id, "Controle technique", None, 365, date(2026, 4, 15), None),
        (vehicles[3].id, "Revision batterie EV", None, 180, date(2026, 5, 1), None),
        (vehicles[1].id, "Changement pneus", 15000, None, None, 20000),
    ]
    for asset_id, name, interval_km, interval_days, due_d, due_k in maint_data:
        mt = MaintenanceTask(
            company_id=company_id,
            asset_id=asset_id,
            task_name=name,
            interval_km=interval_km,
            interval_days=interval_days,
            due_date=due_d,
            due_km=due_k,
            status="PENDING",
        )
        db.add(mt)

    db.flush()


@router.post("/demo", response_model=TokenOut)
def start_demo(db: Session = Depends(get_db)):
    """Create a temporary demo company with sample data and return a token."""

    # Cleanup: delete demo companies older than 24h (keep DB clean)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    old_demos = db.query(Company).filter(
        Company.slug.like("demo-%"),
        Company.created_at < cutoff,
    ).all()
    for old_co in old_demos:
        cid = old_co.id
        # Delete in order (FK constraints)
        db.query(MaintenanceTask).filter(MaintenanceTask.company_id == cid).delete()
        db.query(Incident).filter(Incident.company_id == cid).delete()
        db.query(Event).filter(Event.company_id == cid).delete()
        db.query(Asset).filter(Asset.company_id == cid).delete()
        db.query(EpiCategory).filter(EpiCategory.company_id == cid).delete()
        db.query(Employee).filter(Employee.company_id == cid).delete()
        db.query(Subscription).filter(Subscription.company_id == cid).delete()
        db.query(User).filter(User.company_id == cid).delete()
        db.delete(old_co)
    if old_demos:
        db.commit()

    # Create demo company
    demo_id = secrets.token_hex(4)
    slug = f"demo-{demo_id}"
    company_name = f"Demo Express Livraison {demo_id[:4].upper()}"

    company = Company(
        name=company_name,
        slug=slug,
        contact_email=f"admin@{slug}.gestmat.ch",
    )
    db.add(company)
    db.flush()

    # Demo admin user
    demo_email = f"admin@{slug}.gestmat.ch"
    user = User(
        company_id=company.id,
        email=demo_email,
        password_hash=hash_password("demo1234"),
        role="ADMIN",
    )
    db.add(user)

    # Pro PME+ subscription (so all features are visible)
    plan = db.query(Plan).filter(Plan.code == "PRO_PME_PLUS").first()
    if not plan:
        plan = db.query(Plan).first()
    if plan:
        sub = Subscription(
            company_id=company.id,
            plan_id=plan.id,
            status="ACTIVE",
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=1),
        )
        db.add(sub)

    db.flush()

    # Seed sample data
    _seed_demo_data(db, company.id)

    db.commit()
    db.refresh(user)

    token = create_access_token(
        subject=str(user.id),
        extra={"cid": user.company_id, "role": user.role},
    )
    return TokenOut(access_token=token)
