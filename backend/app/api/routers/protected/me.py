from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import verify_password, hash_password
from app.models.user import User
from app.models.employee import Employee

router = APIRouter()


@router.get("/me")
def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Try to find linked employee by email match
    employee_code = None
    full_name = None
    emp = (
        db.query(Employee)
        .filter(
            Employee.email == current_user.email,
            Employee.company_id == current_user.company_id,
            Employee.is_deleted.is_(False),
            Employee.active.is_(True),
        )
        .first()
    )
    if emp:
        employee_code = emp.employee_code
        full_name = f"{emp.first_name} {emp.last_name}"

    return {
        "id": current_user.id,
        "email": current_user.email,
        "company_id": current_user.company_id,
        "role": current_user.role,
        "employee_code": employee_code,
        "full_name": full_name,
    }


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


@router.patch("/me/password")
def change_password(
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}