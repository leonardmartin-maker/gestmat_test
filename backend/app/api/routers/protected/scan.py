import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_company_id, get_current_user, get_db
from app.core.permissions import require_manager_or_admin
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.models.user import User
from app.schemas.asset import AssetOut
from app.schemas.event import AssignIn, ReturnIn

router = APIRouter()

write_router = APIRouter(dependencies=[Depends(require_manager_or_admin)])


@write_router.post("/assign", response_model=AssetOut)
def assign_asset(
    payload: AssignIn,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    public_id = payload.public_id.strip()

    asset = (
        db.query(Asset)
        .filter(
            Asset.public_id == public_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    if asset.status == "RETIRED":
        raise HTTPException(status_code=400, detail="Asset retiré (RETIRED)")
    if asset.status == "MAINTENANCE":
        raise HTTPException(status_code=400, detail="Asset en maintenance")
    if asset.status == "ASSIGNED":
        raise HTTPException(status_code=400, detail="Asset déjà assigné")

    last_event = (
        db.query(Event)
        .filter(Event.company_id == company_id, Event.asset_id == asset.id)
        .order_by(desc(Event.occurred_at), desc(Event.id))
        .first()
    )
    if last_event and last_event.event_type != "CHECK_IN":
        raise HTTPException(
            status_code=400,
            detail="Attribution impossible: dernier événement n'est pas un CHECK_IN",
        )

    if payload.employee_id is not None:
        employee = (
            db.query(Employee)
            .filter(
                Employee.id == payload.employee_id,
                Employee.company_id == company_id,
                Employee.is_deleted.is_(False),
            )
            .first()
        )
    elif payload.employee_code:
        employee_code = payload.employee_code.strip()
        employee = (
            db.query(Employee)
            .filter(
                Employee.employee_code == employee_code,
                Employee.company_id == company_id,
                Employee.is_deleted.is_(False),
            )
            .first()
        )
    else:
        raise HTTPException(status_code=422, detail="employee_id ou employee_code est requis")

    if not employee:
        raise HTTPException(status_code=404, detail="Employee introuvable")
    if not employee.active:
        raise HTTPException(status_code=400, detail="Employee inactif")

    asset.status = "ASSIGNED"

    evt = Event(
        company_id=company_id,
        asset_id=asset.id,
        employee_id=employee.id,
        user_id=current_user.id,
        event_type="CHECK_OUT",
        km_value=payload.km_value,
        notes=payload.notes,
    )
    db.add(evt)

    db.commit()
    db.refresh(asset)
    return asset


@write_router.post("/return", response_model=AssetOut)
def return_asset(
    payload: ReturnIn,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    public_id = payload.public_id.strip()

    asset = (
        db.query(Asset)
        .filter(
            Asset.public_id == public_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    if asset.status == "RETIRED":
        raise HTTPException(status_code=400, detail="Asset retiré (RETIRED)")
    if asset.status == "MAINTENANCE":
        raise HTTPException(status_code=400, detail="Asset en maintenance")

    last_event = (
        db.query(Event)
        .filter(Event.company_id == company_id, Event.asset_id == asset.id)
        .order_by(desc(Event.occurred_at), desc(Event.id))
        .first()
    )
    if last_event is None or last_event.event_type != "CHECK_OUT":
        raise HTTPException(
            status_code=400,
            detail="Retour impossible: aucun CHECK_OUT récent trouvé",
        )

    asset.status = "AVAILABLE"

    evt = Event(
        company_id=company_id,
        asset_id=asset.id,
        employee_id=last_event.employee_id,
        user_id=current_user.id,
        event_type="CHECK_IN",
        km_value=payload.km_value,
        notes=payload.notes,
    )
    db.add(evt)

    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{public_id}/qr")
def get_qr_code(
    public_id: str,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    public_id = public_id.strip()
    asset = (
        db.query(Asset)
        .filter(
            Asset.public_id == public_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    url = f"{settings.FRONTEND_BASE_URL}/scan?id={asset.public_id}"
    img = qrcode.make(url, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=qr-{asset.public_id}.png"},
    )


@router.get("/{public_id}", response_model=AssetOut)
def scan(
    public_id: str,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    public_id = public_id.strip()

    asset = (
        db.query(Asset)
        .filter(
            Asset.public_id == public_id,
            Asset.company_id == company_id,
            Asset.is_deleted.is_(False),
        )
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")
    return asset


router.include_router(write_router)