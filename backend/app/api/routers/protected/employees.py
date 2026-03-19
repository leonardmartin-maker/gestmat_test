from datetime import datetime, timezone
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.core.permissions import require_admin, require_manager_or_admin
from app.core.security import hash_password
from app.models.employee import Employee
from app.models.user import User
from app.schemas.common import Meta
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeOut,
    EmployeeUpdate,
    EmployeeList,
)
from app.services.email import send_welcome_email


def _generate_password(length: int = 10) -> str:
    """Génère un mot de passe aléatoire lisible (lettres + chiffres)."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

# Routers séparés (branchés dans api/router.py)
router = APIRouter()  # READ public (auth requis via protected_router)
write_router = APIRouter(dependencies=[Depends(require_manager_or_admin)])  # WRITE manager/admin
admin_router = APIRouter(dependencies=[Depends(require_admin)])  # ADMIN only


@router.get("", response_model=EmployeeList)
def list_employees(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    search: str | None = None,
    active: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.is_deleted.is_(False),
    )

    if active is not None:
        q = q.filter(Employee.active == active)

    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Employee.first_name.ilike(s),
                Employee.last_name.ilike(s),
                Employee.employee_code.ilike(s),
            )
        )

    total = q.count()
    items = (
        q.order_by(Employee.last_name.asc(), Employee.first_name.asc(), Employee.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    has_more = offset + limit < total

    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    emp = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id,
            Employee.company_id == company_id,
            Employee.is_deleted.is_(False),
        )
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee introuvable")
    return emp


@write_router.post("", response_model=EmployeeOut)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    email = payload.email.strip() if payload.email else None

    # Si email fourni, vérifier qu'il n'est pas déjà utilisé (User)
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé par un compte existant")

    emp = Employee(
        company_id=company_id,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        employee_code=payload.employee_code.strip() if payload.employee_code else None,
        email=email,
        active=True,
        is_deleted=False,
        deleted_at=None,
    )
    db.add(emp)
    db.flush()  # obtenir emp.id avant commit

    # Créer le compte utilisateur (role EMPLOYEE) si email fourni
    temp_password = None
    if email:
        temp_password = _generate_password()
        user = User(
            company_id=company_id,
            email=email,
            password_hash=hash_password(temp_password),
            role="EMPLOYEE",
        )
        db.add(user)

    db.commit()
    db.refresh(emp)

    # Envoyer le mail de bienvenue avec les identifiants
    if email and temp_password:
        send_welcome_email(
            to=email,
            first_name=payload.first_name.strip(),
            password=temp_password,
        )

    return emp


@write_router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    emp = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id,
            Employee.company_id == company_id,
            Employee.is_deleted.is_(False),
        )
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee introuvable")

    data = payload.model_dump(exclude_unset=True)
    data.pop("company_id", None)

    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(emp, k, v)

    db.commit()
    db.refresh(emp)
    return emp


@admin_router.get("", response_model=EmployeeList)
def list_employees_admin(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    search: str | None = None,
    active: bool | None = None,
    include_deleted: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Employee).filter(Employee.company_id == company_id)
    if not include_deleted:
        q = q.filter(Employee.is_deleted.is_(False))

    if active is not None:
        q = q.filter(Employee.active == active)

    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Employee.first_name.ilike(s),
                Employee.last_name.ilike(s),
                Employee.employee_code.ilike(s),
            )
        )

    total = q.count()
    items = (
        q.order_by(Employee.last_name.asc(), Employee.first_name.asc(), Employee.id.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    has_more = offset + limit < total

    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@admin_router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee_admin(
    employee_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    include_deleted: bool = Query(False),
):
    q = db.query(Employee).filter(Employee.id == employee_id, Employee.company_id == company_id)
    if not include_deleted:
        q = q.filter(Employee.is_deleted.is_(False))

    emp = q.first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee introuvable")
    return emp


@admin_router.delete("/{employee_id}", response_model=EmployeeOut)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    emp = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id,
            Employee.company_id == company_id,
            Employee.is_deleted.is_(False),
        )
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee introuvable")

    emp.active = False
    emp.is_deleted = True
    emp.deleted_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(emp)
    return emp


@admin_router.post("/{employee_id}/restore", response_model=EmployeeOut)
def restore_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    emp = (
        db.query(Employee)
        .filter(Employee.id == employee_id, Employee.company_id == company_id)
        .first()
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee introuvable")

    emp.is_deleted = False
    emp.deleted_at = None
    emp.active = True

    db.commit()
    db.refresh(emp)
    return emp