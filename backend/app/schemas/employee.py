from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.schemas.common import Meta


class EmployeeCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    employee_code: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None

    @field_validator("first_name", "last_name", "employee_code")
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    employee_code: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    active: bool | None = None

    @field_validator("first_name", "last_name", "employee_code")
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class EmployeeOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    employee_code: str | None
    email: str | None
    active: bool
    is_deleted: bool = False
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class EmployeeList(BaseModel):
    data: list[EmployeeOut]
    meta: Meta
