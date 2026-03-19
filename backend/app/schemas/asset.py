from datetime import date
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import Meta

AssetCategory = Literal["VEHICLE", "EPI"]
AssetStatus = Literal["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]


_TEXT_FIELDS = ("name", "ref", "plate", "epi_type", "serial_number", "notes")


class AssetCreate(BaseModel):
    model_config = {"protected_namespaces": ()}
    category: AssetCategory
    name: str = Field(min_length=1, max_length=200)
    ref: str | None = Field(default=None, max_length=100)

    # vehicle
    plate: str | None = Field(default=None, max_length=30)
    model_name: str | None = Field(default=None, max_length=100)
    km_current: int | None = Field(default=None, ge=0)
    insurance_date: date | None = None
    inspection_date: date | None = None

    # epi
    epi_type: str | None = Field(default=None, max_length=100)
    epi_category_id: int | None = None
    epi_attributes: dict[str, Any] | None = None
    serial_number: str | None = Field(default=None, max_length=100)
    next_inspection_date: date | None = None

    notes: str | None = None

    @field_validator(*_TEXT_FIELDS)
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class AssetUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}
    category: AssetCategory | None = None
    name: str | None = Field(default=None, max_length=200)
    ref: str | None = Field(default=None, max_length=100)
    status: AssetStatus | None = None

    plate: str | None = Field(default=None, max_length=30)
    model_name: str | None = Field(default=None, max_length=100)
    km_current: int | None = Field(default=None, ge=0)
    insurance_date: date | None = None
    inspection_date: date | None = None

    epi_type: str | None = Field(default=None, max_length=100)
    epi_category_id: int | None = None
    epi_attributes: dict[str, Any] | None = None
    serial_number: str | None = Field(default=None, max_length=100)
    next_inspection_date: date | None = None

    notes: str | None = None

    @field_validator(*_TEXT_FIELDS)
    @classmethod
    def strip_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class AssetOut(BaseModel):
    model_config = {"from_attributes": True, "protected_namespaces": ()}
    id: int
    category: str
    name: str
    ref: str | None
    status: str
    public_id: str

    plate: str | None
    model_name: str | None = None
    km_current: int | None
    insurance_date: date | None = None
    inspection_date: date | None = None

    epi_type: str | None
    epi_category_id: int | None = None
    epi_attributes: dict[str, Any] | None = None
    serial_number: str | None
    next_inspection_date: date | None = None
    notes: str | None = None


class AssetList(BaseModel):
    data: list[AssetOut]
    meta: Meta

class AssetAssignee(BaseModel):
    employee_id: int
    first_name: str | None = None
    last_name: str | None = None
    employee_code: str | None = None


class AssetOutWithAssignee(AssetOut):
    assigned_to: AssetAssignee | None = None
    last_event_type: str | None = None
    last_event_at: datetime | None = None


class AssetListWithAssignee(BaseModel):
    data: list[AssetOutWithAssignee]
    meta: Meta