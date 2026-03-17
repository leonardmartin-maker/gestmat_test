from pydantic import BaseModel


class Meta(BaseModel):
    limit: int
    offset: int
    total: int
    has_more: bool | None = None