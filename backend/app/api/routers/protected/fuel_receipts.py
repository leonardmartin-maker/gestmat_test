"""Fuel receipts management — manager/admin endpoints + employee self-service."""

import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image
from sqlalchemy import desc, extract
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_user, get_company_id
from app.core.permissions import require_manager_or_admin
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.fuel_receipt import FuelReceipt
from app.models.user import User
from app.services.receipt_ocr import extract_receipt_data

router = APIRouter()
write_router = APIRouter(dependencies=[Depends(require_manager_or_admin)])

MAX_PHOTO_BYTES = settings.MAX_PHOTO_SIZE_MB * 1024 * 1024
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _save_receipt_photo(upload: UploadFile, company_id: int) -> str:
    """Save receipt photo, return relative path."""
    if upload.content_type and upload.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorisé : {upload.content_type}")

    data = await upload.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail=f"Photo trop volumineuse (max {settings.MAX_PHOTO_SIZE_MB} Mo)")

    rel_dir = f"{company_id}/fuel-receipts"
    abs_dir = Path(settings.UPLOAD_DIR) / rel_dir
    abs_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.jpg"
    abs_path = abs_dir / filename
    rel_path = f"{rel_dir}/{filename}"

    try:
        import io
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
        max_dim = 1920
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        img.save(str(abs_path), "JPEG", quality=85, optimize=True)
    except Exception:
        abs_path.write_bytes(data)

    return rel_path


def _receipt_to_dict(r: FuelReceipt, asset_name: str = "", employee_name: str = "") -> dict:
    return {
        "id": r.id,
        "employee_id": r.employee_id,
        "employee_name": employee_name,
        "asset_id": r.asset_id,
        "asset_name": asset_name,
        "photo_url": f"/uploads/{r.photo_path}",
        "amount": float(r.amount) if r.amount is not None else None,
        "liters": float(r.liters) if r.liters is not None else None,
        "receipt_date": r.receipt_date.isoformat() if r.receipt_date else None,
        "status": r.status,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ---------------------------------------------------------------------------
# POST /analyze — OCR preview (upload photo + extract, don't save receipt)
# ---------------------------------------------------------------------------

@router.post("/analyze")
async def analyze_fuel_receipt(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    photo: UploadFile = File(...),
):
    """Upload a photo and run OCR — returns extracted values for preview."""
    rel_path = await _save_receipt_photo(photo, current_user.company_id)
    abs_path = str(Path(settings.UPLOAD_DIR) / rel_path)
    ocr_result = extract_receipt_data(abs_path)

    return {
        "photo_path": rel_path,
        "photo_url": f"/uploads/{rel_path}",
        "amount": ocr_result.amount,
        "liters": ocr_result.liters,
        "date": ocr_result.date,
        "error": ocr_result.error,
    }


# ---------------------------------------------------------------------------
# POST /upload — employee uploads a fuel receipt
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_fuel_receipt(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    asset_id: int = Form(...),
    receipt_date: str = Form(...),  # YYYY-MM-DD
    amount: Optional[float] = Form(None),
    liters: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    photo: UploadFile = File(None),
    photo_path: Optional[str] = Form(None),  # If already analyzed
):
    """Upload a fuel receipt with photo. OCR extracts amount if not provided."""
    # Find the employee
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
        raise HTTPException(status_code=400, detail="Aucun profil employé associé à ce compte")

    # Verify asset exists and belongs to company
    asset = (
        db.query(Asset)
        .filter(
            Asset.id == asset_id,
            Asset.company_id == current_user.company_id,
            Asset.is_deleted.is_(False),
            Asset.category == "VEHICLE",
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")

    # Parse date
    try:
        parsed_date = date.fromisoformat(receipt_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (attendu: YYYY-MM-DD)")

    # Use existing photo_path (from /analyze) or upload new one
    if photo_path:
        # Validate it belongs to this company
        if not photo_path.startswith(f"{current_user.company_id}/"):
            raise HTTPException(status_code=400, detail="Chemin photo invalide")
        rel_path = photo_path
    elif photo:
        rel_path = await _save_receipt_photo(photo, current_user.company_id)
    else:
        raise HTTPException(status_code=400, detail="Photo requise")

    # Run OCR only if no amount provided AND photo was just uploaded (not pre-analyzed)
    ocr_raw = None
    if amount is None and not photo_path:
        abs_path = str(Path(settings.UPLOAD_DIR) / rel_path)
        ocr_result = extract_receipt_data(abs_path)
        ocr_raw = ocr_result.raw_text
        if ocr_result.amount is not None:
            amount = ocr_result.amount
        if ocr_result.liters is not None and liters is None:
            liters = ocr_result.liters
        if ocr_result.date and receipt_date == date.today().isoformat():
            try:
                parsed_date = date.fromisoformat(ocr_result.date)
            except ValueError:
                pass

    receipt = FuelReceipt(
        company_id=current_user.company_id,
        employee_id=employee.id,
        asset_id=asset_id,
        photo_path=rel_path,
        amount=amount,
        liters=liters,
        receipt_date=parsed_date,
        status="PENDING",
        ocr_raw_text=ocr_raw,
        notes=notes,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)

    return {
        "success": True,
        "receipt": _receipt_to_dict(receipt, asset_name=asset.name),
        "ocr_amount": amount,
        "ocr_liters": liters,
    }


# ---------------------------------------------------------------------------
# GET /my — employee's own receipts
# ---------------------------------------------------------------------------

@router.get("/my")
def my_fuel_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
):
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
        return {"data": [], "total": 0}

    q = (
        db.query(FuelReceipt)
        .filter(
            FuelReceipt.company_id == current_user.company_id,
            FuelReceipt.employee_id == employee.id,
        )
        .order_by(desc(FuelReceipt.receipt_date), desc(FuelReceipt.id))
    )

    total = q.count()
    receipts = q.offset(offset).limit(limit).all()

    # Get asset names
    asset_ids = list({r.asset_id for r in receipts})
    asset_map = {}
    if asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        asset_map = {a.id: a.name for a in assets}

    return {
        "data": [_receipt_to_dict(r, asset_name=asset_map.get(r.asset_id, "")) for r in receipts],
        "total": total,
    }


# ---------------------------------------------------------------------------
# GET /my/summary — employee's own monthly summary
# ---------------------------------------------------------------------------

@router.get("/my/summary")
def my_fuel_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    month: int = None,
    year: int = None,
):
    """Monthly summary for the current employee."""
    from sqlalchemy import func

    if not month or not year:
        today = date.today()
        month = month or today.month
        year = year or today.year

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
        return {"month": month, "year": year, "total_amount": 0, "total_liters": 0, "approved_count": 0, "pending_count": 0}

    base = db.query(FuelReceipt).filter(
        FuelReceipt.company_id == current_user.company_id,
        FuelReceipt.employee_id == employee.id,
        extract("month", FuelReceipt.receipt_date) == month,
        extract("year", FuelReceipt.receipt_date) == year,
    )

    approved = base.filter(FuelReceipt.status == "APPROVED")
    pending_count = base.filter(FuelReceipt.status == "PENDING").count()

    result = approved.with_entities(
        func.coalesce(func.sum(FuelReceipt.amount), 0).label("total_amount"),
        func.coalesce(func.sum(FuelReceipt.liters), 0).label("total_liters"),
        func.count(FuelReceipt.id).label("count"),
    ).first()

    return {
        "month": month,
        "year": year,
        "total_amount": float(result.total_amount) if result else 0,
        "total_liters": float(result.total_liters) if result else 0,
        "approved_count": result.count if result else 0,
        "pending_count": pending_count,
    }


# ---------------------------------------------------------------------------
# GET / — all receipts (manager/admin)
# ---------------------------------------------------------------------------

@write_router.get("")
def list_fuel_receipts(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    status: Optional[str] = None,
    employee_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
):
    q = db.query(FuelReceipt).filter(FuelReceipt.company_id == company_id)

    if status:
        q = q.filter(FuelReceipt.status == status.upper())
    if employee_id:
        q = q.filter(FuelReceipt.employee_id == employee_id)
    if month and year:
        q = q.filter(
            extract("month", FuelReceipt.receipt_date) == month,
            extract("year", FuelReceipt.receipt_date) == year,
        )
    elif year:
        q = q.filter(extract("year", FuelReceipt.receipt_date) == year)

    total = q.count()
    receipts = q.order_by(desc(FuelReceipt.receipt_date), desc(FuelReceipt.id)).offset(offset).limit(limit).all()

    # Enrich with names
    asset_ids = list({r.asset_id for r in receipts})
    employee_ids = list({r.employee_id for r in receipts})

    asset_map = {}
    if asset_ids:
        assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        asset_map = {a.id: a.name for a in assets}

    emp_map = {}
    if employee_ids:
        employees = db.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        emp_map = {e.id: f"{e.first_name} {e.last_name}" for e in employees}

    return {
        "data": [
            _receipt_to_dict(r, asset_name=asset_map.get(r.asset_id, ""), employee_name=emp_map.get(r.employee_id, ""))
            for r in receipts
        ],
        "total": total,
    }


# ---------------------------------------------------------------------------
# PATCH /{id}/review — approve or reject (manager/admin)
# ---------------------------------------------------------------------------

@write_router.patch("/{receipt_id}/review")
def review_fuel_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
    status: str = Form(...),  # APPROVED or REJECTED
    notes: Optional[str] = Form(None),
):
    receipt = (
        db.query(FuelReceipt)
        .filter(FuelReceipt.id == receipt_id, FuelReceipt.company_id == company_id)
        .first()
    )
    if not receipt:
        raise HTTPException(status_code=404, detail="Ticket introuvable")

    if status.upper() not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Status invalide (APPROVED ou REJECTED)")

    receipt.status = status.upper()
    receipt.reviewed_by = current_user.id
    receipt.reviewed_at = datetime.utcnow()
    if notes:
        receipt.notes = notes

    db.commit()
    return {"success": True, "status": receipt.status}


# ---------------------------------------------------------------------------
# GET /summary — monthly summary (manager/admin)
# ---------------------------------------------------------------------------

@write_router.get("/summary")
def fuel_receipts_summary(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    month: int = None,
    year: int = None,
):
    """Monthly summary of approved fuel receipts per employee."""
    from sqlalchemy import func

    if not month or not year:
        today = date.today()
        month = month or today.month
        year = year or today.year

    results = (
        db.query(
            FuelReceipt.employee_id,
            func.sum(FuelReceipt.amount).label("total_amount"),
            func.sum(FuelReceipt.liters).label("total_liters"),
            func.count(FuelReceipt.id).label("receipt_count"),
        )
        .filter(
            FuelReceipt.company_id == company_id,
            FuelReceipt.status == "APPROVED",
            extract("month", FuelReceipt.receipt_date) == month,
            extract("year", FuelReceipt.receipt_date) == year,
        )
        .group_by(FuelReceipt.employee_id)
        .all()
    )

    emp_ids = [r.employee_id for r in results]
    emp_map = {}
    if emp_ids:
        employees = db.query(Employee).filter(Employee.id.in_(emp_ids)).all()
        emp_map = {e.id: f"{e.first_name} {e.last_name}" for e in employees}

    return {
        "month": month,
        "year": year,
        "data": [
            {
                "employee_id": r.employee_id,
                "employee_name": emp_map.get(r.employee_id, ""),
                "total_amount": float(r.total_amount) if r.total_amount else 0,
                "total_liters": float(r.total_liters) if r.total_liters else 0,
                "receipt_count": r.receipt_count,
            }
            for r in results
        ],
    }
