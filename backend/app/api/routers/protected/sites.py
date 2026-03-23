"""Sites / Depots management."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, get_company_id
from app.core.permissions import require_admin
from app.models.site import Site
from app.models.user import User
from app.schemas.site import SiteCreate, SiteUpdate, SiteOut, SiteList
from app.schemas.common import Meta

router = APIRouter()  # Any authenticated user
admin_router = APIRouter(dependencies=[Depends(require_admin)])


# ---------------------------------------------------------------------------
# GET /sites — list sites for company
# ---------------------------------------------------------------------------

@router.get("")
def list_sites(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    active: Optional[bool] = None,
    limit: int = 200,
    offset: int = 0,
):
    q = db.query(Site).filter(Site.company_id == company_id)
    if active is not None:
        q = q.filter(Site.is_active == active)
    q = q.order_by(Site.name)

    total = q.count()
    sites = q.offset(offset).limit(limit).all()

    return SiteList(
        data=[SiteOut.model_validate(s) for s in sites],
        meta=Meta(limit=limit, offset=offset, total=total, has_more=offset + limit < total),
    )


# ---------------------------------------------------------------------------
# GET /sites/{id} — get single site
# ---------------------------------------------------------------------------

@router.get("/{site_id}")
def get_site(
    site_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    site = db.query(Site).filter(Site.id == site_id, Site.company_id == company_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site introuvable")
    return SiteOut.model_validate(site)


# ---------------------------------------------------------------------------
# POST /admin/sites — create site (admin only)
# ---------------------------------------------------------------------------

@admin_router.post("")
def create_site(
    payload: SiteCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    site = Site(
        company_id=company_id,
        name=payload.name.strip(),
        address=payload.address.strip() if payload.address else None,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return SiteOut.model_validate(site)


# ---------------------------------------------------------------------------
# PATCH /admin/sites/{id} — update site (admin only)
# ---------------------------------------------------------------------------

@admin_router.patch("/{site_id}")
def update_site(
    site_id: int,
    payload: SiteUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    site = db.query(Site).filter(Site.id == site_id, Site.company_id == company_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site introuvable")

    updates = payload.model_dump(exclude_unset=True)
    for key, val in updates.items():
        if isinstance(val, str):
            val = val.strip()
        setattr(site, key, val)

    db.commit()
    db.refresh(site)
    return SiteOut.model_validate(site)


# ---------------------------------------------------------------------------
# DELETE /admin/sites/{id} — deactivate site (admin only)
# ---------------------------------------------------------------------------

@admin_router.delete("/{site_id}")
def deactivate_site(
    site_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    site = db.query(Site).filter(Site.id == site_id, Site.company_id == company_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site introuvable")

    site.is_active = False
    db.commit()
    db.refresh(site)
    return SiteOut.model_validate(site)
