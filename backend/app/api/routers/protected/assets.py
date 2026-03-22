import secrets
import shutil
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from app.core.config import settings
from app.core.deps import get_company_id, get_current_user, get_db
from app.core.permissions import require_admin, require_manager_or_admin
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.models.user import User
from app.models.event_photo import EventPhoto
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
from app.schemas.event import AssetHistoryOut, EventGroup, EventOut, EventPhotoOut

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
    current_user: User = Depends(get_current_user),
    search: str | None = None,
    status: str | None = None,
    category: str | None = None,
    assigned_to_employee_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    asset_q = db.query(Asset).filter(
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    )

    # Filter: assets assigned to a specific employee
    if assigned_to_employee_id is not None:
        from sqlalchemy import func as sqlfunc
        latest_checkin_sub = (
            db.query(
                Event.asset_id,
                sqlfunc.max(Event.id).label("max_id"),
            )
            .filter(
                Event.company_id == company_id,
                Event.event_type == "CHECK_IN",
            )
            .group_by(Event.asset_id)
            .subquery()
        )
        asset_q = (
            asset_q
            .join(latest_checkin_sub, Asset.id == latest_checkin_sub.c.asset_id)
            .join(Event, Event.id == latest_checkin_sub.c.max_id)
            .filter(
                Asset.status == "ASSIGNED",
                Event.employee_id == assigned_to_employee_id,
            )
        )

    # EMPLOYEE: only see AVAILABLE assets + assets currently assigned to them
    if current_user.role == "EMPLOYEE":
        emp = db.query(Employee).filter(
            Employee.email == current_user.email,
            Employee.company_id == company_id,
            Employee.is_deleted.is_(False),
        ).first()
        emp_id = emp.id if emp else -1
        # Asset IDs where this employee did the last CHECK_IN (= they took it)
        my_assigned_ids = (
            db.query(Event.asset_id)
            .filter(
                Event.company_id == company_id,
                Event.employee_id == emp_id,
                Event.event_type == "CHECK_IN",
            )
            .distinct()
            .subquery()
        )
        asset_q = asset_q.filter(
            or_(
                Asset.status == "AVAILABLE",
                (Asset.status == "ASSIGNED") & (Asset.id.in_(my_assigned_ids)),
            )
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
            and event_type == "CHECK_IN"
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

    # Load photos for all events in one query
    event_ids = [e.id for e in events]
    photos_by_event: dict[int, list[EventPhotoOut]] = defaultdict(list)
    if event_ids:
        photos = db.query(EventPhoto).filter(EventPhoto.event_id.in_(event_ids)).all()
        for p in photos:
            photos_by_event[p.event_id].append(
                EventPhotoOut(id=p.id, category=p.category, url=f"/uploads/{p.file_path}")
            )

    # Load employees for all events in one query
    emp_ids = list({e.employee_id for e in events if e.employee_id})
    emp_map: dict[int, Employee] = {}
    if emp_ids:
        emps = db.query(Employee).filter(Employee.id.in_(emp_ids)).all()
        emp_map = {emp.id: emp for emp in emps}

    buckets: dict[date, list[EventOut]] = defaultdict(list)
    for e in events:
        ev_out = EventOut.model_validate(e)
        ev_out.photos = photos_by_event.get(e.id, [])
        if e.employee_id and e.employee_id in emp_map:
            emp = emp_map[e.employee_id]
            ev_out.employee_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or None
            ev_out.employee_code = emp.employee_code
        buckets[e.occurred_at.date()].append(ev_out)

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
    # Quota check
    from app.services.quota import check_vehicle_quota, check_asset_quota
    if payload.category == "VEHICLE":
        check_vehicle_quota(db, company_id)
    else:
        check_asset_quota(db, company_id)

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


@write_router.post("/{asset_id}/purchase-invoice")
def upload_purchase_invoice(
    asset_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    ).first()
    if not asset:
        raise HTTPException(404, "Asset introuvable")

    # Validate file type
    allowed = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Format non supporte. PDF, JPG, PNG ou WebP uniquement.")

    # Save file
    upload_dir = Path(settings.UPLOAD_DIR) / "invoices" / str(company_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = file.filename.split(".")[-1] if file.filename else "pdf"
    filename = f"purchase_{asset_id}_{secrets.token_hex(4)}.{ext}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    rel_path = f"invoices/{company_id}/{filename}"
    asset.purchase_invoice_path = rel_path
    db.commit()

    return {"ok": True, "url": f"/uploads/{rel_path}"}


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
            and event_type == "CHECK_IN"
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

    # Load photos for all events in one query
    event_ids = [e.id for e in events]
    photos_by_event: dict[int, list[EventPhotoOut]] = defaultdict(list)
    if event_ids:
        photos = db.query(EventPhoto).filter(EventPhoto.event_id.in_(event_ids)).all()
        for p in photos:
            photos_by_event[p.event_id].append(
                EventPhotoOut(id=p.id, category=p.category, url=f"/uploads/{p.file_path}")
            )

    # Load employees for all events in one query
    emp_ids = list({e.employee_id for e in events if e.employee_id})
    emp_map: dict[int, Employee] = {}
    if emp_ids:
        emps = db.query(Employee).filter(Employee.id.in_(emp_ids)).all()
        emp_map = {emp.id: emp for emp in emps}

    buckets: dict[date, list[EventOut]] = defaultdict(list)
    for e in events:
        ev_out = EventOut.model_validate(e)
        ev_out.photos = photos_by_event.get(e.id, [])
        if e.employee_id and e.employee_id in emp_map:
            emp = emp_map[e.employee_id]
            ev_out.employee_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or None
            ev_out.employee_code = emp.employee_code
        buckets[e.occurred_at.date()].append(ev_out)

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