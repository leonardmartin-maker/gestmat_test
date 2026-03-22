"""Incident declarations (accident / breakdown)."""

import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_current_user, get_db
from app.core.permissions import require_manager_or_admin
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.incident import Incident, IncidentPhoto
from app.models.user import User

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class IncidentPhotoOut(BaseModel):
    id: int
    url: str
    category: str = "DAMAGE"

class IncidentOut(BaseModel):
    id: int
    company_id: int
    employee_id: int
    asset_id: int
    incident_type: str
    description: str
    location: str | None
    status: str
    has_third_party: bool = False
    third_party_name: str | None = None
    third_party_plate: str | None = None
    third_party_insurance: str | None = None
    third_party_phone: str | None = None
    resolution_notes: str | None
    resolved_at: datetime | None
    created_at: datetime
    employee_name: str | None = None
    asset_name: str | None = None
    asset_plate: str | None = None
    photos: list[IncidentPhotoOut] = []

class Meta(BaseModel):
    limit: int
    offset: int
    total: int

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UPLOAD_ROOT = os.environ.get("UPLOAD_DIR", "/app/uploads")

def _save_photo(company_id: int, incident_id: int, file: UploadFile) -> str:
    folder = os.path.join(UPLOAD_ROOT, str(company_id), "incidents", str(incident_id))
    os.makedirs(folder, exist_ok=True)
    ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(folder, filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return os.path.join(str(company_id), "incidents", str(incident_id), filename)

def _incident_to_dict(inc: Incident, photos: list[IncidentPhoto], emp_name: str | None = None, asset_name: str | None = None, asset_plate: str | None = None) -> dict:
    return {
        "id": inc.id,
        "company_id": inc.company_id,
        "employee_id": inc.employee_id,
        "asset_id": inc.asset_id,
        "incident_type": inc.incident_type,
        "description": inc.description,
        "location": inc.location,
        "status": inc.status,
        "has_third_party": inc.has_third_party,
        "third_party_name": inc.third_party_name,
        "third_party_plate": inc.third_party_plate,
        "third_party_insurance": inc.third_party_insurance,
        "third_party_phone": inc.third_party_phone,
        "resolution_notes": inc.resolution_notes,
        "resolved_at": inc.resolved_at,
        "created_at": inc.created_at,
        "employee_name": emp_name,
        "asset_name": asset_name,
        "asset_plate": asset_plate,
        "photos": [{"id": p.id, "url": f"/uploads/{p.file_path}", "category": p.category} for p in photos],
    }

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

router = APIRouter()       # any authenticated user
write_router = APIRouter(dependencies=[Depends(require_manager_or_admin)])  # manager/admin

# ---------------------------------------------------------------------------
# POST / — create incident (any user, finds their employee record)
# ---------------------------------------------------------------------------

@router.post("", response_model=IncidentOut)
async def create_incident(
    asset_id: int = Form(...),
    incident_type: str = Form(...),  # ACCIDENT | BREAKDOWN
    description: str = Form(...),
    location: str = Form(None),
    has_third_party: bool = Form(False),
    third_party_name: str = Form(None),
    third_party_plate: str = Form(None),
    third_party_insurance: str = Form(None),
    third_party_phone: str = Form(None),
    photos: list[UploadFile] = File(default=[]),
    third_party_id_photos: list[UploadFile] = File(default=[]),
    third_party_vehicle_photos: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    if incident_type not in ("ACCIDENT", "BREAKDOWN"):
        raise HTTPException(400, "Type doit être ACCIDENT ou BREAKDOWN")

    # Find employee
    employee = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.email == current_user.email,
        Employee.is_deleted.is_(False),
    ).first()
    if not employee:
        raise HTTPException(400, "Employé introuvable")

    # Verify asset exists
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    ).first()
    if not asset:
        raise HTTPException(404, "Matériel introuvable")

    incident = Incident(
        company_id=company_id,
        employee_id=employee.id,
        asset_id=asset_id,
        incident_type=incident_type,
        description=description,
        location=location,
        has_third_party=has_third_party,
        third_party_name=third_party_name if has_third_party else None,
        third_party_plate=third_party_plate if has_third_party else None,
        third_party_insurance=third_party_insurance if has_third_party else None,
        third_party_phone=third_party_phone if has_third_party else None,
        status="PENDING",
    )
    db.add(incident)
    db.flush()

    # Save photos with categories
    saved_photos = []
    for photo in photos:
        if photo.size and photo.size > 0:
            fp = _save_photo(company_id, incident.id, photo)
            ip = IncidentPhoto(incident_id=incident.id, file_path=fp, category="DAMAGE")
            db.add(ip)
            saved_photos.append(ip)
    for photo in third_party_id_photos:
        if photo.size and photo.size > 0:
            fp = _save_photo(company_id, incident.id, photo)
            ip = IncidentPhoto(incident_id=incident.id, file_path=fp, category="THIRD_PARTY_ID")
            db.add(ip)
            saved_photos.append(ip)
    for photo in third_party_vehicle_photos:
        if photo.size and photo.size > 0:
            fp = _save_photo(company_id, incident.id, photo)
            ip = IncidentPhoto(incident_id=incident.id, file_path=fp, category="THIRD_PARTY_VEHICLE")
            db.add(ip)
            saved_photos.append(ip)

    db.commit()
    db.refresh(incident)
    for p in saved_photos:
        db.refresh(p)

    return _incident_to_dict(
        incident, saved_photos,
        emp_name=f"{employee.first_name} {employee.last_name}",
        asset_name=asset.name,
        asset_plate=asset.plate,
    )

# ---------------------------------------------------------------------------
# GET /my — employee's own incidents
# ---------------------------------------------------------------------------

@router.get("/my")
def my_incidents(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
):
    employee = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.email == current_user.email,
        Employee.is_deleted.is_(False),
    ).first()
    if not employee:
        return {"data": []}

    incidents = (
        db.query(Incident)
        .filter(Incident.company_id == company_id, Incident.employee_id == employee.id)
        .order_by(desc(Incident.created_at))
        .limit(limit)
        .all()
    )

    # Load photos and asset names
    inc_ids = [i.id for i in incidents]
    photo_map: dict[int, list[IncidentPhoto]] = {}
    if inc_ids:
        all_photos = db.query(IncidentPhoto).filter(IncidentPhoto.incident_id.in_(inc_ids)).all()
        for p in all_photos:
            photo_map.setdefault(p.incident_id, []).append(p)

    asset_ids = list({i.asset_id for i in incidents})
    asset_map = {}
    if asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        asset_map = {a.id: a for a in assets}

    return {
        "data": [
            _incident_to_dict(
                i, photo_map.get(i.id, []),
                asset_name=asset_map.get(i.asset_id, None) and asset_map[i.asset_id].name,
                asset_plate=asset_map.get(i.asset_id, None) and asset_map[i.asset_id].plate,
            )
            for i in incidents
        ]
    }

# ---------------------------------------------------------------------------
# GET / — all incidents (manager/admin)
# ---------------------------------------------------------------------------

@write_router.get("")
def list_incidents(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    status: str | None = Query(None),
    incident_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Incident).filter(Incident.company_id == company_id)
    if status:
        q = q.filter(Incident.status == status)
    if incident_type:
        q = q.filter(Incident.incident_type == incident_type)

    total = q.count()
    incidents = q.order_by(desc(Incident.created_at)).offset(offset).limit(limit).all()

    # Load photos, employees, assets
    inc_ids = [i.id for i in incidents]
    photo_map: dict[int, list[IncidentPhoto]] = {}
    if inc_ids:
        all_photos = db.query(IncidentPhoto).filter(IncidentPhoto.incident_id.in_(inc_ids)).all()
        for p in all_photos:
            photo_map.setdefault(p.incident_id, []).append(p)

    emp_ids = list({i.employee_id for i in incidents})
    emp_map = {}
    if emp_ids:
        emps = db.query(Employee).filter(Employee.id.in_(emp_ids)).all()
        emp_map = {e.id: e for e in emps}

    asset_ids = list({i.asset_id for i in incidents})
    asset_map = {}
    if asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        asset_map = {a.id: a for a in assets}

    return {
        "data": [
            _incident_to_dict(
                i, photo_map.get(i.id, []),
                emp_name=(lambda e: f"{e.first_name} {e.last_name}" if e else None)(emp_map.get(i.employee_id)),
                asset_name=asset_map.get(i.asset_id, None) and asset_map[i.asset_id].name,
                asset_plate=asset_map.get(i.asset_id, None) and asset_map[i.asset_id].plate,
            )
            for i in incidents
        ],
        "meta": {"limit": limit, "offset": offset, "total": total},
    }

# ---------------------------------------------------------------------------
# PATCH /{id}/status — update status (manager/admin)
# ---------------------------------------------------------------------------

class StatusUpdate(BaseModel):
    status: str  # IN_PROGRESS | RESOLVED
    resolution_notes: str | None = None

@write_router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    if payload.status not in ("IN_PROGRESS", "RESOLVED"):
        raise HTTPException(400, "Status doit être IN_PROGRESS ou RESOLVED")

    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.company_id == company_id,
    ).first()
    if not incident:
        raise HTTPException(404, "Incident introuvable")

    incident.status = payload.status
    if payload.status == "RESOLVED":
        incident.resolved_by = current_user.id
        incident.resolved_at = datetime.now(timezone.utc)
    if payload.resolution_notes:
        incident.resolution_notes = payload.resolution_notes

    db.commit()
    return {"ok": True, "status": incident.status}
