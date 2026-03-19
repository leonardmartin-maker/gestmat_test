from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.common import Meta
from app.constants.epi_attributes import VALID_ATTRIBUTE_KEYS


class EpiCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str | None = None
    enabled_attributes: list[str] = Field(default_factory=list)

    def model_post_init(self, __context: object) -> None:
        invalid = set(self.enabled_attributes) - VALID_ATTRIBUTE_KEYS
        if invalid:
            raise ValueError(f"Attributs invalides : {invalid}")


class EpiCategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    enabled_attributes: list[str] | None = None

    def model_post_init(self, __context: object) -> None:
        if self.enabled_attributes is not None:
            invalid = set(self.enabled_attributes) - VALID_ATTRIBUTE_KEYS
            if invalid:
                raise ValueError(f"Attributs invalides : {invalid}")


class EpiCategoryOut(BaseModel):
    id: int
    company_id: int
    name: str
    icon: str | None
    enabled_attributes: list[str]
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class EpiCategoryList(BaseModel):
    data: list[EpiCategoryOut]
    meta: Meta
