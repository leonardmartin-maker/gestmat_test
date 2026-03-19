from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.core.permissions import require_admin
from app.models.epi_category import EpiCategory
from app.constants.epi_attributes import EPI_PREDEFINED_ATTRIBUTES
from app.schemas.common import Meta
from app.schemas.epi_category import (
    EpiCategoryCreate,
    EpiCategoryList,
    EpiCategoryOut,
    EpiCategoryUpdate,
)

# Read router — accessible à tous les users authentifiés
router = APIRouter()

# Admin router — CRUD complet
admin_router = APIRouter(dependencies=[Depends(require_admin)])


# ─── READ (all authenticated users) ────────────────────────────

@router.get("", response_model=EpiCategoryList)
def list_epi_categories(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(EpiCategory).filter(
        EpiCategory.company_id == company_id,
        EpiCategory.is_deleted.is_(False),
    )
    total = q.count()
    items = q.order_by(EpiCategory.name.asc()).offset(offset).limit(limit).all()
    has_more = offset + limit < total
    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


# ─── ADMIN ──────────────────────────────────────────────────────

@admin_router.get("/attributes")
def get_predefined_attributes():
    """Retourne la liste des attributs prédéfinis disponibles."""
    return EPI_PREDEFINED_ATTRIBUTES


@admin_router.get("", response_model=EpiCategoryList)
def list_epi_categories_admin(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    include_deleted: bool = Query(False),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(EpiCategory).filter(EpiCategory.company_id == company_id)
    if not include_deleted:
        q = q.filter(EpiCategory.is_deleted.is_(False))
    total = q.count()
    items = q.order_by(EpiCategory.name.asc()).offset(offset).limit(limit).all()
    has_more = offset + limit < total
    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@admin_router.post("", response_model=EpiCategoryOut)
def create_epi_category(
    payload: EpiCategoryCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    cat = EpiCategory(
        company_id=company_id,
        name=payload.name.strip(),
        icon=payload.icon,
        enabled_attributes=payload.enabled_attributes,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@admin_router.patch("/{category_id}", response_model=EpiCategoryOut)
def update_epi_category(
    category_id: int,
    payload: EpiCategoryUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    cat = db.query(EpiCategory).filter(
        EpiCategory.id == category_id,
        EpiCategory.company_id == company_id,
        EpiCategory.is_deleted.is_(False),
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(cat, k, v)

    db.commit()
    db.refresh(cat)
    return cat


@admin_router.delete("/{category_id}", response_model=EpiCategoryOut)
def delete_epi_category(
    category_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    cat = db.query(EpiCategory).filter(
        EpiCategory.id == category_id,
        EpiCategory.company_id == company_id,
        EpiCategory.is_deleted.is_(False),
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")

    cat.is_deleted = True
    db.commit()
    db.refresh(cat)
    return cat
