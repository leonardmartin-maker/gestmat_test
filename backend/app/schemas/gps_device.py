from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class GpsDeviceCreate(BaseModel):
    asset_id: int
    imei: str = Field(..., min_length=15, max_length=15)
    device_model: str | None = None
    label: str | None = None


class GpsDeviceUpdate(BaseModel):
    asset_id: int | None = None
    imei: str | None = Field(None, min_length=15, max_length=15)
    device_model: str | None = None
    label: str | None = None


class GpsDeviceOut(BaseModel):
    id: int
    company_id: int
    asset_id: int
    imei: str
    device_model: str | None = None
    label: str | None = None
    relay_state: str
    is_online: bool
    last_connected_at: datetime | None = None
    last_lat: float | None = None
    last_lng: float | None = None
    last_speed: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GpsCommandResult(BaseModel):
    success: bool
    message: str
    relay_state: str | None = None
