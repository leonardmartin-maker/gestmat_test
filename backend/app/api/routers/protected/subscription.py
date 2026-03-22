"""Subscription management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_company_id, get_current_user, get_db
from app.core.permissions import require_admin
from app.models.company import Company
from app.models.subscription import Plan, Subscription
from app.models.user import User
from app.services.quota import get_limits

router = APIRouter()  # any authenticated user
admin_router = APIRouter(dependencies=[Depends(require_admin)])


# ---------------------------------------------------------------------------
# GET /subscription — current company subscription info
# ---------------------------------------------------------------------------

@router.get("")
def get_subscription(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        return {"subscription": None, "limits": None, "plans": _get_plans(db)}

    plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
    limits = get_limits(db, company_id)

    return {
        "subscription": {
            "id": sub.id,
            "plan_code": plan.code if plan else None,
            "plan_name": plan.name if plan else None,
            "status": sub.status,
            "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "extra_employees": sub.extra_employees,
            "stripe_customer_id": sub.stripe_customer_id,
            "stripe_subscription_id": sub.stripe_subscription_id,
        },
        "limits": limits,
        "plans": _get_plans(db),
    }


# ---------------------------------------------------------------------------
# GET /subscription/plans — list available plans
# ---------------------------------------------------------------------------

@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    return {"plans": _get_plans(db)}


# ---------------------------------------------------------------------------
# GET /subscription/stripe-config — return publishable key
# ---------------------------------------------------------------------------

@router.get("/stripe-config")
def get_stripe_config():
    return {"publishable_key": settings.STRIPE_PUBLISHABLE_KEY}


# ---------------------------------------------------------------------------
# POST /subscription/checkout — create Stripe Checkout session (admin)
# ---------------------------------------------------------------------------

class CheckoutIn(BaseModel):
    plan_code: str
    with_fuel: bool = False


@admin_router.post("/checkout")
def create_checkout(
    payload: CheckoutIn,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    from app.services.stripe_service import create_checkout_session

    try:
        url = create_checkout_session(
            db=db,
            company_id=company_id,
            plan_code=payload.plan_code,
            with_fuel=payload.with_fuel,
        )
        return {"checkout_url": url}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erreur Stripe: {str(e)}")


# ---------------------------------------------------------------------------
# POST /subscription/customer-portal — Stripe billing portal (admin)
# ---------------------------------------------------------------------------

@admin_router.post("/customer-portal")
def create_portal_session(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    from app.services.stripe_service import create_customer_portal_session

    try:
        url = create_customer_portal_session(db, company_id)
        return {"portal_url": url}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erreur Stripe: {str(e)}")


# ---------------------------------------------------------------------------
# POST /subscription/change-plan — upgrade/downgrade (admin only)
# ---------------------------------------------------------------------------

class ChangePlanIn(BaseModel):
    plan_code: str


@admin_router.post("/change-plan")
def change_plan(
    payload: ChangePlanIn,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(Plan).filter(Plan.code == payload.plan_code, Plan.is_active.is_(True)).first()
    if not plan:
        raise HTTPException(400, "Plan introuvable")

    if plan.code == "TRIAL":
        raise HTTPException(400, "Impossible de revenir a l'essai")

    if plan.code == "ENTERPRISE":
        raise HTTPException(400, "Contactez-nous pour le plan Entreprise")

    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(400, "Aucun abonnement trouve")

    # If Stripe subscription exists, redirect to checkout/portal instead
    if sub.stripe_subscription_id:
        raise HTTPException(
            400,
            "Vous avez un abonnement Stripe actif. Utilisez le portail de facturation pour changer de plan."
        )

    # Update plan (manual / no Stripe)
    sub.plan_id = plan.id
    sub.status = "ACTIVE"
    sub.trial_ends_at = None
    db.commit()

    return {"ok": True, "plan": plan.code, "status": sub.status}


# ---------------------------------------------------------------------------
# POST /subscription/add-employees — add extra employees (admin only)
# ---------------------------------------------------------------------------

class AddEmployeesIn(BaseModel):
    count: int


@admin_router.post("/add-employees")
def add_extra_employees(
    payload: AddEmployeesIn,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    if payload.count < 1 or payload.count > 100:
        raise HTTPException(400, "Nombre invalide (1-100)")

    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(400, "Aucun abonnement trouve")

    sub.extra_employees = sub.extra_employees + payload.count
    db.commit()

    return {"ok": True, "extra_employees": sub.extra_employees}


# ---------------------------------------------------------------------------
# GET /subscription/company — company info (admin only)
# ---------------------------------------------------------------------------

@admin_router.get("/company")
def get_company_info(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Entreprise introuvable")

    return {
        "id": company.id,
        "name": company.name,
        "slug": company.slug,
        "contact_email": company.contact_email,
        "phone": company.phone,
        "address": company.address,
        "logo_path": company.logo_path,
    }


# ---------------------------------------------------------------------------
# PATCH /subscription/company — update company info (admin only)
# ---------------------------------------------------------------------------

class UpdateCompanyIn(BaseModel):
    name: str | None = None
    contact_email: str | None = None
    phone: str | None = None
    address: str | None = None


@admin_router.patch("/company")
def update_company(
    payload: UpdateCompanyIn,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Entreprise introuvable")

    if payload.name is not None:
        company.name = payload.name
    if payload.contact_email is not None:
        company.contact_email = payload.contact_email
    if payload.phone is not None:
        company.phone = payload.phone
    if payload.address is not None:
        company.address = payload.address

    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_plans(db: Session) -> list[dict]:
    plans = db.query(Plan).filter(
        Plan.is_active.is_(True),
        Plan.code != "FUEL_OPTION",  # Don't show fuel as a plan
    ).order_by(Plan.price_chf).all()
    return [
        {
            "code": p.code,
            "name": p.name,
            "price_chf": float(p.price_chf),
            "extra_employee_price_chf": float(p.extra_employee_price_chf),
            "max_employees": p.max_employees,
            "max_vehicles": p.max_vehicles,
            "max_assets": p.max_assets,
            "trial_days": p.trial_days,
            "stripe_price_id": p.stripe_price_id,
        }
        for p in plans
    ]
