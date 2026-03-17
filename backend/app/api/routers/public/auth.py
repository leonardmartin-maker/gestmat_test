from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.company import Company
from app.models.user import User
from app.schemas.auth import RegisterIn, LoginIn, TokenOut

router = APIRouter()  # <-- PAS de prefix ici (il est dans api/router.py)


@router.post("/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    company = db.query(Company).filter(Company.name == payload.company_name).first()
    if company is None:
        company = Company(name=payload.company_name)
        db.add(company)
        try:
            db.commit()
            db.refresh(company)
        except IntegrityError:
            db.rollback()
            company = db.query(Company).filter(Company.name == payload.company_name).first()
            if company is None:
                raise HTTPException(status_code=500, detail="Erreur création société")

    user = User(
        company_id=company.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="ADMIN",
    )
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

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

    token = create_access_token(
        subject=str(user.id),
        extra={"cid": user.company_id, "role": user.role},
    )
    return TokenOut(access_token=token)