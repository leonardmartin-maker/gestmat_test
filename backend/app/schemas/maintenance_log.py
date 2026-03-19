from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.common import Meta


class MaintenanceLogOut(BaseModel):
    id: int
    company_id: int
    asset_id: int
    task_id: int | None = None
    task_name: str
    performed_at: date
    km_at: int | None = None
    performed_by: int | None = None
    performer_name: str | None = None  # joined
    notes: str | None = None
    cost: float | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class MaintenanceLogList(BaseModel):
    data: list[MaintenanceLogOut]
    meta: Meta
