from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import Meta


class MaintenanceTemplateCreate(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_name: str = Field(min_length=1, max_length=100)
    task_name: str = Field(min_length=1, max_length=200)
    interval_km: int | None = Field(default=None, ge=1)
    interval_days: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def at_least_one_interval(self):
        if self.interval_km is None and self.interval_days is None:
            raise ValueError("Au moins un intervalle (km ou jours) est requis.")
        return self


class MaintenanceTemplateUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_name: str | None = Field(default=None, max_length=100)
    task_name: str | None = Field(default=None, max_length=200)
    interval_km: int | None = Field(default=None, ge=1)
    interval_days: int | None = Field(default=None, ge=1)


class MaintenanceTemplateOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: int
    company_id: int
    model_name: str
    task_name: str
    interval_km: int | None
    interval_days: int | None
    created_at: datetime | None = None


class MaintenanceTemplateList(BaseModel):
    data: list[MaintenanceTemplateOut]
    meta: Meta
