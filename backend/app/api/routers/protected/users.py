from datetime import datetime
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_current_user, get_db
from app.core.permissions import require_admin
from app.core.security import hash_password
from app.models.user import User
from app.models.employee import Employee
from app.services.email import send_welcome_email
from app.schemas.common import Meta

router = APIRouter(dependencies=[Depends(require_admin)])


def _generate_password(length: int = 10) -> str:
    """Génère un mot de passe aléatoire lisible (lettres + chiffres)."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    first_name: str | None = None
    last_name: str | None = None
    employee_code: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class UserList(BaseModel):
    data: list[UserOut]
    meta: Meta


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    employee_code: str = Field(min_length=1)
    role: str = Field(default="EMPLOYEE", pattern="^(ADMIN|MANAGER|EMPLOYEE)$")


class UserUpdateRole(BaseModel):
    role: str = Field(pattern="^(ADMIN|MANAGER|EMPLOYEE)$")


@router.get("", response_model=UserList)
def list_users(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(User).filter(User.company_id == company_id, User.is_active.is_(True))
    total = q.count()
    users = q.order_by(User.id).offset(offset).limit(limit).all()
    has_more = offset + limit < total

    # Enrichir avec les infos Employee
    user_data = []
    for u in users:
        emp = db.query(Employee).filter(
            Employee.company_id == company_id,
            Employee.email == u.email,
            Employee.is_deleted.is_(False),
        ).first()
        user_data.append(UserOut(
            id=u.id,
            email=u.email,
            role=u.role,
            first_name=emp.first_name if emp else None,
            last_name=emp.last_name if emp else None,
            employee_code=emp.employee_code if emp else None,
            created_at=u.created_at,
        ))

    return {"data": user_data, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    email = payload.email.strip().lower()

    # Vérifier que l'email n'est pas déjà utilisé
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Générer un mot de passe aléatoire
    temp_password = _generate_password()

    # Créer le User
    user = User(
        company_id=company_id,
        email=email,
        password_hash=hash_password(temp_password),
        role=payload.role,
    )
    db.add(user)
    db.flush()

    # Créer l'Employee associé
    emp = Employee(
        company_id=company_id,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        employee_code=payload.employee_code.strip(),
        email=email,
        active=True,
        is_deleted=False,
    )
    db.add(emp)

    db.commit()
    db.refresh(user)

    # Envoyer le mail de bienvenue avec identifiants (non-bloquant)
    send_welcome_email(
        to=email,
        first_name=payload.first_name.strip(),
        password=temp_password,
    )

    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        employee_code=payload.employee_code.strip(),
        created_at=user.created_at,
    )


@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: UserUpdateRole,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de modifier son propre rôle")

    user = db.query(User).filter(User.id == user_id, User.company_id == company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    user.role = payload.role
    db.commit()
    db.refresh(user)

    emp = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.email == user.email,
        Employee.is_deleted.is_(False),
    ).first()

    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        first_name=emp.first_name if emp else None,
        last_name=emp.last_name if emp else None,
        employee_code=emp.employee_code if emp else None,
        created_at=user.created_at,
    )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer son propre compte")

    user = db.query(User).filter(User.id == user_id, User.company_id == company_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Supprimer aussi l'employé associé (soft delete)
    emp = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.email == user.email,
        Employee.is_deleted.is_(False),
    ).first()
    if emp:
        emp.active = False
        emp.is_deleted = True

    user.is_active = False
    db.commit()
    return {"ok": True}
