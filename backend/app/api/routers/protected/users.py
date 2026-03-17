from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_current_user, get_db
from app.core.permissions import require_admin
from app.core.security import hash_password
from app.models.user import User
from app.schemas.common import Meta

router = APIRouter(dependencies=[Depends(require_admin)])


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class UserList(BaseModel):
    data: list[UserOut]
    meta: Meta


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
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
    q = db.query(User).filter(User.company_id == company_id)
    total = q.count()
    users = q.order_by(User.id).offset(offset).limit(limit).all()
    has_more = offset + limit < total
    return {"data": users, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    user = User(
        company_id=company_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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
    return user


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

    db.delete(user)
    db.commit()
    return {"ok": True}
