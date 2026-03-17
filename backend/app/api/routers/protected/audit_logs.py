from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.core.permissions import require_admin
from app.models.audit_log import AuditLog
from app.schemas.common import Meta
from app.schemas.audit import AuditLogList

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=AuditLogList)
def list_audit_logs(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    action: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(AuditLog).filter(AuditLog.company_id == company_id)

    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action == action)

    total = q.count()
    items = (
        q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    has_more = offset + limit < total

    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}