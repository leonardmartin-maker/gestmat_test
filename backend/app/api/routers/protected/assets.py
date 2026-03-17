from collections import defaultdict
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from app.core.deps import get_company_id, get_db
from app.core.permissions import require_admin, require_manager_or_admin
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.schemas.asset import (
    AssetAssignee,
    AssetCreate,
    AssetList,
    AssetListWithAssignee,
    AssetOut,
    AssetOutWithAssignee,
    AssetUpdate,
)
from app.schemas.common import Meta
from app.schemas.event import AssetHistoryOut, EventGroup, EventOut

# Routers séparés (branchés dans api/router.py)
router = APIRouter()  # READ user (auth via protected_router)
write_router = APIRouter(dependencies=[Depends(require_manager_or_admin)])  # WRITE manager/admin
admin_router = APIRouter(dependencies=[Depends(require_admin)])  # ADMIN zone


# -------------------------
# READ (user) routes
# -------------------------

@router.get("", response_model=AssetList)
def list_assets(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    search: str | None = None,
    status: str | None = None,
    category: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Asset).filter(
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    )

    if status:
        q = q.filter(Asset.status == status)
    if category:
        q = q.filter(Asset.category == category)

    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Asset.name.ilike(s),
                Asset.ref.ilike(s),
                Asset.plate.ilike(s),
                Asset.serial_number.ilike(s),
                Asset.public_id.ilike(s),
            )
        )

    total = q.count()
    items = q.order_by(Asset.id.desc()).offset(offset).limit(limit).all()
    has_more = offset + limit < total

    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@router.get("/with-assignee", response_model=AssetListWithAssignee)
def list_assets_with_assignee(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    search: str | None = None,
    status: str | None = None,
    category: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    asset_q = db.query(Asset).filter(
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    )

    if status:
        asset_q = asset_q.filter(Asset.status == status)
    if category:
        asset_q = asset_q.filter(Asset.category == category)
    if search:
        s = f"%{search.strip()}%"
        asset_q = asset_q.filter(
            or_(
                Asset.name.ilike(s),
                Asset.ref.ilike(s),
                Asset.plate.ilike(s),
                Asset.serial_number.ilike(s),
                Asset.public_id.ilike(s),
            )
        )

    total = asset_q.count()
    has_more = offset + limit < total

    assets_page_subq = (
        asset_q.order_by(Asset.id.desc())
        .offset(offset)
        .limit(limit)
        .subquery()
    )
    A = aliased(Asset, assets_page_subq)

    # Postgres DISTINCT ON : dernier event par asset
    last_evt_subq = (
        db.query(
            Event.asset_id.label("asset_id"),
            Event.event_type.label("event_type"),
            Event.employee_id.label("employee_id"),
            Event.occurred_at.label("occurred_at"),
            Event.id.label("event_id"),
        )
        .filter(Event.company_id == company_id)
        .order_by(Event.asset_id, Event.occurred_at.desc(), Event.id.desc())
        .distinct(Event.asset_id)
        .subquery()
    )

    E = last_evt_subq
    Emp = aliased(Employee)

    rows = (
        db.query(A, E.c.event_type, E.c.employee_id, E.c.occurred_at, Emp)
        .outerjoin(E, E.c.asset_id == A.id)
        .outerjoin(Emp, Emp.id == E.c.employee_id)
        .all()
    )

    out: list[AssetOutWithAssignee] = []
    for asset, event_type, employee_id, occurred_at, emp in rows:
        assigned_to = None
        if (
            asset.status == "ASSIGNED"
            and event_type == "CHECK_OUT"
            and employee_id
            and emp
            and emp.company_id == company_id
            and getattr(emp, "is_deleted", False) is False
        ):
            assigned_to = AssetAssignee(
                employee_id=emp.id,
                first_name=emp.first_name,
                last_name=emp.last_name,
                employee_code=emp.employee_code,
            )

        row = AssetOutWithAssignee.model_validate(asset)
        row.assigned_to = assigned_to
        row.last_event_type = event_type
        row.last_event_at = occurred_at
        out.append(row)

    return {"data": out, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@router.get("/{asset_id}/history", response_model=AssetHistoryOut)
def asset_history(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = (
        db.query(Asset)
        .filter(
            Asset.id == asset_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    events = (
        db.query(Event)
        .filter(Event.company_id == company_id, Event.asset_id == asset_id)
        .order_by(Event.occurred_at.desc(), Event.id.desc())
        .all()
    )

    buckets: dict[date, list[EventOut]] = defaultdict(list)
    for e in events:
        buckets[e.occurred_at.date()].append(EventOut.model_validate(e))

    groups = [EventGroup(date=d, events=buckets[d]) for d in sorted(buckets.keys(), reverse=True)]
    return {"asset_id": asset_id, "groups": groups}


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = (
        db.query(Asset)
        .filter(
            Asset.id == asset_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")
    return asset


# -------------------------
# WRITE routes (MANAGER/ADMIN)
# -------------------------

@write_router.post("", response_model=AssetOut)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = Asset(
        company_id=company_id,
        is_deleted=False,
        deleted_at=None,
        **payload.model_dump(),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@write_router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = (
        db.query(Asset)
        .filter(
            Asset.id == asset_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    data = payload.model_dump(exclude_unset=True)
    data.pop("company_id", None)

    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(asset, k, v)

    db.commit()
    db.refresh(asset)
    return asset


# -------------------------
# ADMIN routes
# -------------------------

@admin_router.get("", response_model=AssetList)
def list_assets_admin(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    search: str | None = None,
    status: str | None = None,
    category: str | None = None,
    include_deleted: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Asset).filter(Asset.company_id == company_id)
    if not include_deleted:
        q = q.filter(Asset.is_deleted.is_(False))

    if status:
        q = q.filter(Asset.status == status)
    if category:
        q = q.filter(Asset.category == category)

    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Asset.name.ilike(s),
                Asset.ref.ilike(s),
                Asset.plate.ilike(s),
                Asset.serial_number.ilike(s),
                Asset.public_id.ilike(s),
            )
        )

    total = q.count()
    items = q.order_by(Asset.id.desc()).offset(offset).limit(limit).all()
    has_more = offset + limit < total

    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@admin_router.get("/with-assignee", response_model=AssetListWithAssignee)
def list_assets_with_assignee_admin(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    search: str | None = None,
    status: str | None = None,
    category: str | None = None,
    include_deleted: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    # identique à la version user mais asset_q inclut éventuellement deleted
    asset_q = db.query(Asset).filter(Asset.company_id == company_id)
    if not include_deleted:
        asset_q = asset_q.filter(Asset.is_deleted.is_(False))

    if status:
        asset_q = asset_q.filter(Asset.status == status)
    if category:
        asset_q = asset_q.filter(Asset.category == category)
    if search:
        s = f"%{search.strip()}%"
        asset_q = asset_q.filter(
            or_(
                Asset.name.ilike(s),
                Asset.ref.ilike(s),
                Asset.plate.ilike(s),
                Asset.serial_number.ilike(s),
                Asset.public_id.ilike(s),
            )
        )

    total = asset_q.count()
    has_more = offset + limit < total

    assets_page_subq = (
        asset_q.order_by(Asset.id.desc())
        .offset(offset)
        .limit(limit)
        .subquery()
    )
    A = aliased(Asset, assets_page_subq)

    last_evt_subq = (
        db.query(
            Event.asset_id.label("asset_id"),
            Event.event_type.label("event_type"),
            Event.employee_id.label("employee_id"),
            Event.occurred_at.label("occurred_at"),
            Event.id.label("event_id"),
        )
        .filter(Event.company_id == company_id)
        .order_by(Event.asset_id, Event.occurred_at.desc(), Event.id.desc())
        .distinct(Event.asset_id)
        .subquery()
    )

    E = last_evt_subq
    Emp = aliased(Employee)

    rows = (
        db.query(A, E.c.event_type, E.c.employee_id, E.c.occurred_at, Emp)
        .outerjoin(E, E.c.asset_id == A.id)
        .outerjoin(Emp, Emp.id == E.c.employee_id)
        .all()
    )

    out: list[AssetOutWithAssignee] = []
    for asset, event_type, employee_id, occurred_at, emp in rows:
        assigned_to = None
        if (
            asset.status == "ASSIGNED"
            and event_type == "CHECK_OUT"
            and employee_id
            and emp
            and emp.company_id == company_id
            and getattr(emp, "is_deleted", False) is False
        ):
            assigned_to = AssetAssignee(
                employee_id=emp.id,
                first_name=emp.first_name,
                last_name=emp.last_name,
                employee_code=emp.employee_code,
            )

        row = AssetOutWithAssignee.model_validate(asset)
        row.assigned_to = assigned_to
        row.last_event_type = event_type
        row.last_event_at = occurred_at
        out.append(row)

    return {"data": out, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@admin_router.get("/{asset_id}", response_model=AssetOut)
def get_asset_admin(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    include_deleted: bool = Query(False),
):
    q = db.query(Asset).filter(Asset.id == asset_id, Asset.company_id == company_id)
    if not include_deleted:
        q = q.filter(Asset.is_deleted.is_(False))

    asset = q.first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")
    return asset


@admin_router.get("/{asset_id}/history", response_model=AssetHistoryOut)
def asset_history_admin(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = (
        db.query(Asset)
        .filter(Asset.id == asset_id, Asset.company_id == company_id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    events = (
        db.query(Event)
        .filter(Event.company_id == company_id, Event.asset_id == asset_id)
        .order_by(Event.occurred_at.desc(), Event.id.desc())
        .all()
    )

    buckets: dict[date, list[EventOut]] = defaultdict(list)
    for e in events:
        buckets[e.occurred_at.date()].append(EventOut.model_validate(e))

    groups = [EventGroup(date=d, events=buckets[d]) for d in sorted(buckets.keys(), reverse=True)]
    return {"asset_id": asset_id, "groups": groups}


@admin_router.delete("/{asset_id}", response_model=AssetOut)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = (
        db.query(Asset)
        .filter(
            Asset.id == asset_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    asset.is_deleted = True
    asset.deleted_at = datetime.now(timezone.utc)
    asset.status = "RETIRED"

    db.commit()
    db.refresh(asset)
    return asset


@admin_router.post("/{asset_id}/restore", response_model=AssetOut)
def restore_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = (
        db.query(Asset)
        .filter(Asset.id == asset_id, Asset.company_id == company_id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    asset.is_deleted = False
    asset.deleted_at = None
    if asset.status == "RETIRED":
        asset.status = "AVAILABLE"

    db.commit()
    db.refresh(asset)
    return asset