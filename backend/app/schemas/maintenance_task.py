from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.common import Meta


class MaintenanceTaskOut(BaseModel):
    id: int
    company_id: int
    asset_id: int
    template_id: int | None = None
    task_name: str
    interval_km: int | None = None
    interval_days: int | None = None
    due_date: date | None = None
    due_km: int | None = None
    last_done_date: date | None = None
    last_done_km: int | None = None
    status: str
    created_at: datetime | None = None

    # Joined fields (optional, filled by API)
    asset_name: str | None = None
    asset_plate: str | None = None
    asset_km: int | None = None

    class Config:
        from_attributes = True


class MaintenanceTaskList(BaseModel):
    data: list[MaintenanceTaskOut]
    meta: Meta


class MaintenanceTaskComplete(BaseModel):
    performed_at: date
    km_at: int | None = Field(default=None, ge=0)
    notes: str | None = None
    cost: float | None = Field(default=None, ge=0)


class MaintenanceTasksOverview(BaseModel):
    overdue: list[MaintenanceTaskOut]
    due_soon_7d: list[MaintenanceTaskOut]
    due_soon_30d: list[MaintenanceTaskOut]
    total_tasks: int
    total_overdue: int
    total_due: int


class KmUpdate(BaseModel):
    km: int = Field(ge=0)
