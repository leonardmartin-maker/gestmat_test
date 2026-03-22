from datetime import datetime
from datetime import date as date_type
from pydantic import BaseModel, Field
from app.schemas.common import Meta


class EventPhotoOut(BaseModel):
    id: int
    category: str
    url: str


class EventOut(BaseModel):
    id: int
    company_id: int
    asset_id: int
    employee_id: int | None
    user_id: int | None
    event_type: str
    occurred_at: datetime
    created_at: datetime
    km_value: int | None
    notes: str | None
    damage_description: str | None = None
    photos: list[EventPhotoOut] = []
    employee_name: str | None = None
    employee_code: str | None = None
    asset_name: str | None = None

    class Config:
        from_attributes = True


class EventList(BaseModel):
    data: list[EventOut]
    meta: Meta


class AssignIn(BaseModel):
    public_id: str = Field(min_length=1, max_length=64)
    employee_id: int | None = None
    employee_code: str | None = Field(default=None, max_length=50)
    km_value: int | None = Field(default=None, ge=0)
    notes: str | None = None


class ReturnIn(BaseModel):
    public_id: str = Field(min_length=1, max_length=64)
    km_value: int | None = Field(default=None, ge=0)
    notes: str | None = None

class EventGroup(BaseModel):
    date: date_type
    events: list[EventOut]

class AssetHistoryOut(BaseModel):
    asset_id: int
    groups: list[EventGroup]