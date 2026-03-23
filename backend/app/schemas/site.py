from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.common import Meta


class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=500)


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    address: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class SiteOut(BaseModel):
    id: int
    name: str
    address: str | None = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class SiteList(BaseModel):
    data: list[SiteOut]
    meta: Meta
