from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.models.event_photo import EventPhoto
from app.schemas.common import Meta
from app.schemas.event import EventList, EventOut, EventPhotoOut

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
        raise HTTPException(status_code=422, detail="Parametres invalides: from > to")

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
    events = (
        q.order_by(Event.occurred_at.desc(), Event.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    has_more = offset + limit < total

    # Enrich with asset_name and employee info
    asset_ids = list({e.asset_id for e in events if e.asset_id})
    asset_map: dict[int, Asset] = {}
    if asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        asset_map = {a.id: a for a in assets}

    emp_ids = list({e.employee_id for e in events if e.employee_id})
    emp_map: dict[int, Employee] = {}
    if emp_ids:
        emps = db.query(Employee).filter(Employee.id.in_(emp_ids)).all()
        emp_map = {emp.id: emp for emp in emps}

    # Load photos for all events
    event_ids = [e.id for e in events]
    photo_map: dict[int, list[EventPhotoOut]] = {}
    if event_ids:
        photos = db.query(EventPhoto).filter(EventPhoto.event_id.in_(event_ids)).all()
        for p in photos:
            photo_map.setdefault(p.event_id, []).append(
                EventPhotoOut(id=p.id, category=p.category, url=f"/uploads/{p.file_path}")
            )

    items: list[EventOut] = []
    for e in events:
        ev_out = EventOut.model_validate(e)
        if e.asset_id and e.asset_id in asset_map:
            ev_out.asset_name = asset_map[e.asset_id].name
        if e.employee_id and e.employee_id in emp_map:
            emp = emp_map[e.employee_id]
            ev_out.employee_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or None
            ev_out.employee_code = emp.employee_code
        ev_out.photos = photo_map.get(e.id, [])
        items.append(ev_out)

    return {
        "data": items,
        "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more),
    }
