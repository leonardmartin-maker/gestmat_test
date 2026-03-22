"""Authenticated employee self-service scan endpoints (with photo upload)."""

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image
from sqlalchemy import desc
from sqlalchemy.orm import Session

from sqlalchemy import func as sqlfunc

from app.core.config import settings
from app.core.deps import get_db, get_current_user
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.models.event_photo import EventPhoto
from app.models.user import User
from app.schemas.public_scan import (
    PublicActionResult,
    PublicAssetOut,
    PhotoOut,
)

router = APIRouter()

MAX_PHOTO_BYTES = settings.MAX_PHOTO_SIZE_MB * 1024 * 1024
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_asset_or_404(db: Session, public_id: str) -> Asset:
    asset = (
        db.query(Asset)
        .filter(Asset.public_id == public_id.strip(), Asset.is_deleted.is_(False))
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Matériel introuvable")
    return asset


def _get_employee_or_404(db: Session, employee_code: str, company_id: int) -> Employee:
    employee = (
        db.query(Employee)
        .filter(
            Employee.employee_code == employee_code.strip(),
            Employee.company_id == company_id,
            Employee.is_deleted.is_(False),
        )
        .first()
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Code employé introuvable")
    if not employee.active:
        raise HTTPException(status_code=400, detail="Ce compte employé est désactivé")
    return employee


async def _save_photo(upload: UploadFile, company_id: int, event_id: int) -> str:
    """Save an uploaded photo, resize if needed, return relative path."""
    if upload.content_type and upload.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorisé : {upload.content_type}")

    data = await upload.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail=f"Photo trop volumineuse (max {settings.MAX_PHOTO_SIZE_MB} Mo)")

    # Build path
    rel_dir = f"{company_id}/events/{event_id}"
    abs_dir = Path(settings.UPLOAD_DIR) / rel_dir
    abs_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.jpg"
    abs_path = abs_dir / filename
    rel_path = f"{rel_dir}/{filename}"

    # Resize with Pillow (max 1920px on longest side), save as JPEG
    try:
        import io
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
        max_dim = 1920
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        img.save(str(abs_path), "JPEG", quality=85, optimize=True)
    except Exception:
        # Fallback: save raw bytes
        abs_path.write_bytes(data)

    return rel_path


async def _process_photos(
    files: list[UploadFile],
    category: str,
    company_id: int,
    event_id: int,
    db: Session,
) -> list[EventPhoto]:
    """Save photos and create EventPhoto records."""
    photos = []
    for f in files:
        if not f.filename:
            continue
        rel_path = await _save_photo(f, company_id, event_id)
        photo = EventPhoto(
            event_id=event_id,
            category=category,
            file_path=rel_path,
        )
        db.add(photo)
        photos.append(photo)
    return photos


def _photo_to_out(photo: EventPhoto) -> PhotoOut:
    return PhotoOut(
        id=photo.id,
        category=photo.category,
        url=f"/uploads/{photo.file_path}",
    )


def _check_employee_limits(db: Session, employee: Employee, asset: Asset):
    """
    Enforce: max 1 vehicle at a time, max 1 EPI per category at a time.
    Raises HTTPException 400 if limit exceeded.
    """
    # Subquery: latest CHECK_IN event id per asset
    latest_checkin = (
        db.query(
            Event.asset_id,
            sqlfunc.max(Event.id).label("max_id"),
        )
        .filter(
            Event.company_id == asset.company_id,
            Event.event_type == "CHECK_IN",
        )
        .group_by(Event.asset_id)
        .subquery()
    )

    # Base query: assets ASSIGNED to this employee
    q = (
        db.query(Asset)
        .join(latest_checkin, Asset.id == latest_checkin.c.asset_id)
        .join(Event, Event.id == latest_checkin.c.max_id)
        .filter(
            Asset.company_id == asset.company_id,
            Asset.status == "ASSIGNED",
            Asset.is_deleted.is_(False),
            Asset.id != asset.id,  # exclude the asset being taken
            Event.employee_id == employee.id,
        )
    )

    if asset.category == "VEHICLE":
        existing = q.filter(Asset.category == "VEHICLE").first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Vous avez déjà un véhicule assigné ({existing.name}). Veuillez le retourner d'abord.",
            )
    elif asset.category == "EPI" and asset.epi_category_id is not None:
        existing = q.filter(
            Asset.category == "EPI",
            Asset.epi_category_id == asset.epi_category_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Vous avez déjà un EPI de cette catégorie ({existing.name}). Veuillez le retourner d'abord.",
            )


# ---------------------------------------------------------------------------
# GET /my-events — employee's own event history
# ---------------------------------------------------------------------------

@router.get("/my-events")
def my_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
):
    """Return events for the employee linked to the current user (via email match)."""
    from app.models.event_photo import EventPhoto as EP

    # Find employee by email match
    employee = (
        db.query(Employee)
        .filter(
            Employee.email == current_user.email,
            Employee.company_id == current_user.company_id,
            Employee.is_deleted.is_(False),
        )
        .first()
    )
    if not employee:
        return {"data": []}

    events = (
        db.query(Event)
        .filter(
            Event.company_id == current_user.company_id,
            Event.employee_id == employee.id,
        )
        .order_by(desc(Event.occurred_at), desc(Event.id))
        .limit(limit)
        .all()
    )

    # Enrich with asset names and photos
    asset_ids = list({e.asset_id for e in events if e.asset_id})
    asset_map = {}
    if asset_ids:
        from app.models.asset import Asset as A
        assets = db.query(A).filter(A.id.in_(asset_ids)).all()
        asset_map = {a.id: a.name for a in assets}

    event_ids = [e.id for e in events]
    photo_map: dict = {}
    if event_ids:
        photos = db.query(EP).filter(EP.event_id.in_(event_ids)).all()
        for p in photos:
            photo_map.setdefault(p.event_id, []).append({
                "id": p.id,
                "category": p.category,
                "url": f"/uploads/{p.file_path}",
            })

    data = []
    for e in events:
        data.append({
            "id": e.id,
            "event_type": e.event_type,
            "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
            "asset_id": e.asset_id,
            "asset_name": asset_map.get(e.asset_id, f"Asset #{e.asset_id}"),
            "km_value": e.km_value,
            "notes": e.notes,
            "damage_description": e.damage_description,
            "photos": photo_map.get(e.id, []),
        })

    return {"data": data}


# ---------------------------------------------------------------------------
# GET /maintenance-alerts — maintenance notifications for the employee
# ---------------------------------------------------------------------------

@router.get("/maintenance-alerts")
def maintenance_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return upcoming/overdue maintenance tasks for vehicles assigned to this employee."""
    from datetime import date, timedelta
    from app.models.maintenance_task import MaintenanceTask

    # Find employee by email match
    employee = (
        db.query(Employee)
        .filter(
            Employee.email == current_user.email,
            Employee.company_id == current_user.company_id,
            Employee.is_deleted.is_(False),
        )
        .first()
    )
    if not employee:
        return {"data": []}

    # Find vehicles ASSIGNED to this employee
    latest_checkin = (
        db.query(
            Event.asset_id,
            sqlfunc.max(Event.id).label("max_id"),
        )
        .filter(
            Event.company_id == current_user.company_id,
            Event.event_type == "CHECK_IN",
        )
        .group_by(Event.asset_id)
        .subquery()
    )

    my_vehicles = (
        db.query(Asset)
        .join(latest_checkin, Asset.id == latest_checkin.c.asset_id)
        .join(Event, Event.id == latest_checkin.c.max_id)
        .filter(
            Asset.company_id == current_user.company_id,
            Asset.status == "ASSIGNED",
            Asset.category == "VEHICLE",
            Asset.is_deleted.is_(False),
            Event.employee_id == employee.id,
        )
        .all()
    )

    if not my_vehicles:
        return {"data": []}

    vehicle_ids = [v.id for v in my_vehicles]
    vehicle_map = {v.id: v for v in my_vehicles}
    today = date.today()
    threshold_date = today + timedelta(days=7)

    # Find pending maintenance tasks for these vehicles
    tasks = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.asset_id.in_(vehicle_ids),
            MaintenanceTask.is_deleted.is_(False),
            MaintenanceTask.status.in_(["PENDING", "DUE", "OVERDUE"]),
        )
        .all()
    )

    alerts = []
    for t in tasks:
        vehicle = vehicle_map.get(t.asset_id)
        if not vehicle:
            continue

        is_due_date = t.due_date is not None and t.due_date <= threshold_date
        is_due_km = (
            t.due_km is not None
            and vehicle.km_current is not None
            and t.due_km <= vehicle.km_current + 500
        )

        if not is_due_date and not is_due_km:
            continue

        # Determine urgency
        overdue = False
        if t.due_date and t.due_date <= today:
            overdue = True
        if t.due_km and vehicle.km_current and t.due_km <= vehicle.km_current:
            overdue = True

        if is_due_date:
            days_left = (t.due_date - today).days
            due_value = f"dans {days_left} jour(s)" if days_left > 0 else "en retard"
            due_type = "date"
        else:
            km_left = t.due_km - (vehicle.km_current or 0)
            due_value = f"dans {km_left} km" if km_left > 0 else "en retard"
            due_type = "km"

        alerts.append({
            "id": t.id,
            "asset_name": vehicle.name,
            "task_name": t.task_name,
            "due_type": due_type,
            "due_value": due_value,
            "urgency": "critical" if overdue else "warning",
        })

    return {"data": alerts}


# ---------------------------------------------------------------------------
# GET  /{public_id}  — asset info (limited fields)
# ---------------------------------------------------------------------------

@router.get("/{public_id}", response_model=PublicAssetOut)
def employee_scan(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = _get_asset_or_404(db, public_id)
    return asset


# ---------------------------------------------------------------------------
# POST /take  — employee self-service check-in (multipart with photos)
# ---------------------------------------------------------------------------

@router.post("/take", response_model=PublicActionResult)
async def employee_take(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    public_id: str = Form(...),
    employee_code: str = Form(...),
    km_value: Optional[int] = Form(None),
    notes: Optional[str] = Form(None),
    damage_description: Optional[str] = Form(None),
    state_photos: list[UploadFile] = File(...),
    damage_photos: list[UploadFile] = File(default=[]),
    km_photo: list[UploadFile] = File(default=[]),
):
    asset = _get_asset_or_404(db, public_id)
    employee = _get_employee_or_404(db, employee_code, asset.company_id)

    # --- validations ---
    if asset.status == "RETIRED":
        raise HTTPException(status_code=400, detail="Ce matériel est retiré du service")
    if asset.status == "MAINTENANCE":
        raise HTTPException(status_code=400, detail="Ce matériel est en maintenance")
    if asset.status == "ASSIGNED":
        raise HTTPException(status_code=400, detail="Ce matériel est déjà pris par quelqu'un")

    # Filter out empty file uploads (browser sends empty entry when no file selected)
    state_photos = [f for f in state_photos if f.filename]
    damage_photos = [f for f in damage_photos if f.filename]
    km_photo = [f for f in km_photo if f.filename]

    if not state_photos:
        raise HTTPException(status_code=400, detail="Au moins une photo d'état est requise")
    if len(state_photos) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 photos d'état")
    if len(damage_photos) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 photos de dommage")

    # KM photo required for vehicles
    if asset.category == "VEHICLE" and not km_photo:
        raise HTTPException(status_code=400, detail="La photo du compteur kilométrique est obligatoire pour un véhicule")

    # KM required for vehicles
    if asset.category == "VEHICLE" and km_value is None:
        raise HTTPException(status_code=400, detail="Le kilométrage est obligatoire pour un véhicule")

    # KM cannot be less than current
    if km_value is not None and asset.km_current is not None and km_value < asset.km_current:
        raise HTTPException(
            status_code=400,
            detail=f"Le kilométrage ({km_value}) ne peut pas être inférieur au kilométrage actuel ({asset.km_current})",
        )

    # Status-based check is sufficient (ASSIGNED/RETIRED/MAINTENANCE already rejected above)
    # No need to check last event type — avoids issues with legacy event data.

    # Enforce limits: 1 vehicle at a time, 1 EPI per category
    _check_employee_limits(db, employee, asset)

    # --- apply ---
    asset.status = "ASSIGNED"
    if km_value is not None and asset.category == "VEHICLE":
        asset.km_current = km_value

    evt = Event(
        company_id=asset.company_id,
        asset_id=asset.id,
        employee_id=employee.id,
        user_id=current_user.id,
        event_type="CHECK_IN",
        km_value=km_value,
        notes=notes,
        damage_description=damage_description if damage_photos else None,
    )
    db.add(evt)
    db.flush()  # get evt.id

    # Save photos
    all_photos = []
    all_photos += await _process_photos(state_photos, "STATE", asset.company_id, evt.id, db)
    if km_photo:
        all_photos += await _process_photos(km_photo, "KM", asset.company_id, evt.id, db)
    if damage_photos:
        all_photos += await _process_photos(damage_photos, "DAMAGE", asset.company_id, evt.id, db)

    db.commit()
    db.refresh(asset)

    return PublicActionResult(
        success=True,
        message=f"{asset.name} pris par {employee.first_name} {employee.last_name}",
        asset=PublicAssetOut.model_validate(asset),
        photos=[_photo_to_out(p) for p in all_photos],
    )


# ---------------------------------------------------------------------------
# POST /return  — employee self-service check-out (multipart with photos)
# ---------------------------------------------------------------------------

@router.post("/return", response_model=PublicActionResult)
async def employee_return(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    public_id: str = Form(...),
    employee_code: str = Form(...),
    km_value: Optional[int] = Form(None),
    notes: Optional[str] = Form(None),
    damage_description: Optional[str] = Form(None),
    state_photos: list[UploadFile] = File(...),
    damage_photos: list[UploadFile] = File(default=[]),
    km_photo: list[UploadFile] = File(default=[]),
):
    asset = _get_asset_or_404(db, public_id)
    employee = _get_employee_or_404(db, employee_code, asset.company_id)

    # --- validations ---
    if asset.status == "RETIRED":
        raise HTTPException(status_code=400, detail="Ce matériel est retiré du service")
    if asset.status == "MAINTENANCE":
        raise HTTPException(status_code=400, detail="Ce matériel est en maintenance")

    # Filter out empty file uploads
    state_photos = [f for f in state_photos if f.filename]
    damage_photos = [f for f in damage_photos if f.filename]
    km_photo = [f for f in km_photo if f.filename]

    if not state_photos:
        raise HTTPException(status_code=400, detail="Au moins une photo d'état est requise")
    if len(state_photos) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 photos d'état")
    if len(damage_photos) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 photos de dommage")

    # KM photo required for vehicles
    if asset.category == "VEHICLE" and not km_photo:
        raise HTTPException(status_code=400, detail="La photo du compteur kilométrique est obligatoire pour un véhicule")

    # KM required for vehicles
    if asset.category == "VEHICLE" and km_value is None:
        raise HTTPException(status_code=400, detail="Le kilométrage est obligatoire pour un véhicule")

    # KM cannot be less than current
    if km_value is not None and asset.km_current is not None and km_value < asset.km_current:
        raise HTTPException(
            status_code=400,
            detail=f"Le kilométrage ({km_value}) ne peut pas être inférieur au kilométrage actuel ({asset.km_current})",
        )

    if asset.status != "ASSIGNED":
        raise HTTPException(
            status_code=400,
            detail="Retour impossible : ce matériel n'est pas pris actuellement",
        )

    # Security: only the employee who took it can return it via self-service
    last_event = (
        db.query(Event)
        .filter(
            Event.company_id == asset.company_id,
            Event.asset_id == asset.id,
            Event.event_type == "CHECK_IN",
        )
        .order_by(desc(Event.occurred_at), desc(Event.id))
        .first()
    )
    if last_event and last_event.employee_id != employee.id:
        raise HTTPException(
            status_code=403,
            detail="Seul l'employé qui a pris ce matériel peut le retourner",
        )

    # --- apply ---
    asset.status = "AVAILABLE"
    if km_value is not None and asset.category == "VEHICLE":
        asset.km_current = km_value

    evt = Event(
        company_id=asset.company_id,
        asset_id=asset.id,
        employee_id=employee.id,
        user_id=current_user.id,
        event_type="CHECK_OUT",
        km_value=km_value,
        notes=notes,
        damage_description=damage_description if damage_photos else None,
    )
    db.add(evt)
    db.flush()

    # Save photos
    all_photos = []
    all_photos += await _process_photos(state_photos, "STATE", asset.company_id, evt.id, db)
    if km_photo:
        all_photos += await _process_photos(km_photo, "KM", asset.company_id, evt.id, db)
    if damage_photos:
        all_photos += await _process_photos(damage_photos, "DAMAGE", asset.company_id, evt.id, db)

    db.commit()
    db.refresh(asset)

    return PublicActionResult(
        success=True,
        message=f"{asset.name} retourné par {employee.first_name} {employee.last_name}",
        asset=PublicAssetOut.model_validate(asset),
        photos=[_photo_to_out(p) for p in all_photos],
    )


# ---------------------------------------------------------------------------
# GET /events/{event_id}/photos — list photos for an event
# ---------------------------------------------------------------------------

@router.get("/events/{event_id}/photos", response_model=list[PhotoOut])
def get_event_photos(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    evt = db.query(Event).filter(Event.id == event_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Événement introuvable")

    photos = db.query(EventPhoto).filter(EventPhoto.event_id == event_id).all()
    return [_photo_to_out(p) for p in photos]
