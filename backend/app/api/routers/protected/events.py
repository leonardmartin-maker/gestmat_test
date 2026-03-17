from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.models.event import Event
from app.schemas.common import Meta
from app.schemas.event import EventList

router = APIRouter()


@router.get("", response_model=EventList)
def list_events(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    asset_id: int | None = None,
    employee_id: int | None = None,
    user_id: int | None = None,
    event_type: str | None = None,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    # Basic validation
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="Paramètres invalides: from > to")

    q = db.query(Event).filter(Event.company_id == company_id)

    if asset_id is not None:
        q = q.filter(Event.asset_id == asset_id)
    if employee_id is not None:
        q = q.filter(Event.employee_id == employee_id)
    if user_id is not None:
        q = q.filter(Event.user_id == user_id)
    if event_type:
        q = q.filter(Event.event_type == event_type)

    if date_from:
        q = q.filter(Event.occurred_at >= date_from)
    if date_to:
        q = q.filter(Event.occurred_at <= date_to)

    total = q.count()
    items = (
        q.order_by(Event.occurred_at.desc(), Event.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    has_more = offset + limit < total

    return {
        "data": items,
        "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more),
    }