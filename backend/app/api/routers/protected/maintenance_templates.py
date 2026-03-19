from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.core.permissions import require_admin
from app.models.maintenance_template import MaintenanceTemplate
from app.constants.maintenance_templates import SCOOTER_MAINTENANCE_TEMPLATES, KNOWN_MODELS
from app.schemas.common import Meta
from app.schemas.maintenance_template import (
    MaintenanceTemplateCreate,
    MaintenanceTemplateList,
    MaintenanceTemplateOut,
    MaintenanceTemplateUpdate,
)

admin_router = APIRouter(dependencies=[Depends(require_admin)])


@admin_router.get("/models")
def get_known_models():
    """Retourne la liste des modèles de scooter connus."""
    return KNOWN_MODELS


@admin_router.get("", response_model=MaintenanceTemplateList)
def list_templates(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    model_name: str | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    q = db.query(MaintenanceTemplate).filter(
        MaintenanceTemplate.company_id == company_id,
        MaintenanceTemplate.is_deleted.is_(False),
    )
    if model_name:
        q = q.filter(MaintenanceTemplate.model_name == model_name)
    total = q.count()
    items = q.order_by(MaintenanceTemplate.model_name, MaintenanceTemplate.id).offset(offset).limit(limit).all()
    has_more = offset + limit < total
    return {"data": items, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@admin_router.post("/seed")
def seed_templates(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    """Initialise les plans constructeur. Idempotent: ne crée pas de doublons."""
    existing = db.query(MaintenanceTemplate).filter(
        MaintenanceTemplate.company_id == company_id,
        MaintenanceTemplate.is_deleted.is_(False),
    ).all()

    existing_keys = {(t.model_name, t.task_name) for t in existing}
    created = 0

    for tmpl in SCOOTER_MAINTENANCE_TEMPLATES:
        key = (tmpl["model_name"], tmpl["task_name"])
        if key in existing_keys:
            continue
        obj = MaintenanceTemplate(
            company_id=company_id,
            model_name=tmpl["model_name"],
            task_name=tmpl["task_name"],
            interval_km=tmpl["interval_km"],
            interval_days=tmpl["interval_days"],
        )
        db.add(obj)
        created += 1

    db.commit()
    return {"created": created, "total": len(SCOOTER_MAINTENANCE_TEMPLATES)}


@admin_router.post("", response_model=MaintenanceTemplateOut)
def create_template(
    payload: MaintenanceTemplateCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    obj = MaintenanceTemplate(
        company_id=company_id,
        model_name=payload.model_name.strip(),
        task_name=payload.task_name.strip(),
        interval_km=payload.interval_km,
        interval_days=payload.interval_days,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@admin_router.patch("/{template_id}", response_model=MaintenanceTemplateOut)
def update_template(
    template_id: int,
    payload: MaintenanceTemplateUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    obj = db.query(MaintenanceTemplate).filter(
        MaintenanceTemplate.id == template_id,
        MaintenanceTemplate.company_id == company_id,
        MaintenanceTemplate.is_deleted.is_(False),
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Template introuvable")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if isinstance(v, str):
            v = v.strip()
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)
    return obj


@admin_router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    obj = db.query(MaintenanceTemplate).filter(
        MaintenanceTemplate.id == template_id,
        MaintenanceTemplate.company_id == company_id,
        MaintenanceTemplate.is_deleted.is_(False),
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Template introuvable")

    obj.is_deleted = True
    db.commit()
    return {"ok": True}
