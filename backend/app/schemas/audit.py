from datetime import datetime
from pydantic import BaseModel
from app.schemas.common import Meta


class AuditLogOut(BaseModel):
    id: int
    company_id: int
    user_id: int | None
    entity_type: str
    entity_id: int
    action: str
    before: dict | None
    after: dict | None
    request_id: str | None
    ip: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogList(BaseModel):
    data: list[AuditLogOut]
    meta: Meta