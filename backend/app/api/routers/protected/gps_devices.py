"""GPS device management endpoints (admin) + status/relay control."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.asset import Asset
from app.models.gps_device import GpsDevice
from app.models.user import User
from app.schemas.gps_device import (
    GpsDeviceCreate,
    GpsDeviceUpdate,
    GpsDeviceOut,
    GpsCommandResult,
)

logger = logging.getLogger("teltonika")

# Read router — any authenticated user in same company
router = APIRouter()

# Admin router — ADMIN only
admin_router = APIRouter()


def _require_admin(user: User):
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin uniquement")


# ---------------------------------------------------------------------------
# GET /gps-devices — list GPS devices for the company
# ---------------------------------------------------------------------------

@router.get("", response_model=list[GpsDeviceOut])
def list_gps_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    devices = (
        db.query(GpsDevice)
        .filter(GpsDevice.company_id == current_user.company_id)
        .order_by(GpsDevice.id)
        .all()
    )
    return devices


@router.get("/{device_id}", response_model=GpsDeviceOut)
def get_gps_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device = (
        db.query(GpsDevice)
        .filter(
            GpsDevice.id == device_id,
            GpsDevice.company_id == current_user.company_id,
        )
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="GPS device introuvable")
    return device


# ---------------------------------------------------------------------------
# ADMIN CRUD
# ---------------------------------------------------------------------------

@admin_router.post("", response_model=GpsDeviceOut, status_code=201)
def create_gps_device(
    payload: GpsDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    # Verify asset belongs to same company
    asset = db.query(Asset).filter(
        Asset.id == payload.asset_id,
        Asset.company_id == current_user.company_id,
        Asset.is_deleted.is_(False),
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Matériel introuvable")

    # Check IMEI uniqueness
    existing = db.query(GpsDevice).filter(GpsDevice.imei == payload.imei).first()
    if existing:
        raise HTTPException(status_code=409, detail="IMEI déjà enregistré")

    # Check asset not already linked
    existing_asset = db.query(GpsDevice).filter(GpsDevice.asset_id == payload.asset_id).first()
    if existing_asset:
        raise HTTPException(status_code=409, detail="Ce matériel a déjà un boîtier GPS")

    device = GpsDevice(
        company_id=current_user.company_id,
        asset_id=payload.asset_id,
        imei=payload.imei,
        device_model=payload.device_model,
        label=payload.label,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@admin_router.patch("/{device_id}", response_model=GpsDeviceOut)
def update_gps_device(
    device_id: int,
    payload: GpsDeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    device = (
        db.query(GpsDevice)
        .filter(
            GpsDevice.id == device_id,
            GpsDevice.company_id == current_user.company_id,
        )
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="GPS device introuvable")

    data = payload.model_dump(exclude_unset=True)

    if "imei" in data and data["imei"] != device.imei:
        dup = db.query(GpsDevice).filter(GpsDevice.imei == data["imei"]).first()
        if dup:
            raise HTTPException(status_code=409, detail="IMEI déjà enregistré")

    if "asset_id" in data and data["asset_id"] != device.asset_id:
        asset = db.query(Asset).filter(
            Asset.id == data["asset_id"],
            Asset.company_id == current_user.company_id,
            Asset.is_deleted.is_(False),
        ).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Matériel introuvable")
        dup = db.query(GpsDevice).filter(
            GpsDevice.asset_id == data["asset_id"],
            GpsDevice.id != device_id,
        ).first()
        if dup:
            raise HTTPException(status_code=409, detail="Ce matériel a déjà un boîtier GPS")

    for k, v in data.items():
        setattr(device, k, v)

    db.commit()
    db.refresh(device)
    return device


@admin_router.delete("/{device_id}", status_code=204)
def delete_gps_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    device = (
        db.query(GpsDevice)
        .filter(
            GpsDevice.id == device_id,
            GpsDevice.company_id == current_user.company_id,
        )
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="GPS device introuvable")

    db.delete(device)
    db.commit()


# ---------------------------------------------------------------------------
# Relay control (ADMIN / MANAGER)
# ---------------------------------------------------------------------------

@admin_router.post("/{device_id}/immobilize", response_model=GpsCommandResult)
async def immobilize_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("ADMIN", "MANAGER"):
        raise HTTPException(status_code=403, detail="Admin ou Manager uniquement")

    device = (
        db.query(GpsDevice)
        .filter(
            GpsDevice.id == device_id,
            GpsDevice.company_id == current_user.company_id,
        )
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="GPS device introuvable")

    if not device.is_online:
        return GpsCommandResult(
            success=False,
            message="Appareil hors ligne",
            relay_state=device.relay_state,
        )

    from app.services.teltonika import immobilize
    ok = await immobilize(device.imei)
    if ok:
        device.relay_state = "ON"
        db.commit()
        return GpsCommandResult(
            success=True,
            message="Véhicule immobilisé (relais ON)",
            relay_state="ON",
        )
    return GpsCommandResult(
        success=False,
        message="Échec de la commande — timeout ou erreur",
        relay_state=device.relay_state,
    )


@admin_router.post("/{device_id}/de-immobilize", response_model=GpsCommandResult)
async def de_immobilize_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("ADMIN", "MANAGER"):
        raise HTTPException(status_code=403, detail="Admin ou Manager uniquement")

    device = (
        db.query(GpsDevice)
        .filter(
            GpsDevice.id == device_id,
            GpsDevice.company_id == current_user.company_id,
        )
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="GPS device introuvable")

    if not device.is_online:
        return GpsCommandResult(
            success=False,
            message="Appareil hors ligne",
            relay_state=device.relay_state,
        )

    from app.services.teltonika import de_immobilize
    ok = await de_immobilize(device.imei)
    if ok:
        device.relay_state = "OFF"
        db.commit()
        return GpsCommandResult(
            success=True,
            message="Véhicule débloqué (relais OFF)",
            relay_state="OFF",
        )
    return GpsCommandResult(
        success=False,
        message="Échec de la commande — timeout ou erreur",
        relay_state=device.relay_state,
    )
