from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_current_user, get_db
from app.core.permissions import require_manager_or_admin
from app.models.asset import Asset
from app.models.maintenance_task import MaintenanceTask
from app.models.maintenance_template import MaintenanceTemplate
from app.models.maintenance_log import MaintenanceLog
from app.models.user import User
from app.schemas.common import Meta
from app.schemas.maintenance_task import (
    MaintenanceTaskComplete,
    MaintenanceTaskList,
    MaintenanceTaskOut,
    MaintenanceTasksOverview,
    KmUpdate,
)


# Read router — tous les users authentifiés
router = APIRouter()

# Write router — manager/admin
write_router = APIRouter(dependencies=[Depends(require_manager_or_admin)])


# ─── Helpers ─────────────────────────────────────────────────────

def _recalculate_status(task: MaintenanceTask, asset_km: int | None, today: date):
    """Recalcule le statut d'une tâche en fonction du km et de la date."""
    overdue = False
    due = False

    if task.due_date:
        if task.due_date <= today:
            overdue = True
        elif task.due_date <= today + timedelta(days=7):
            due = True

    if task.due_km and asset_km is not None:
        if asset_km >= task.due_km:
            overdue = True
        elif (task.due_km - asset_km) <= 500:
            due = True

    if overdue:
        task.status = "OVERDUE"
    elif due:
        task.status = "DUE"
    else:
        task.status = "PENDING"


def _enrich_task(task: MaintenanceTask, asset: Asset) -> MaintenanceTaskOut:
    """Convertit une MaintenanceTask en MaintenanceTaskOut avec les infos asset."""
    return MaintenanceTaskOut(
        id=task.id,
        company_id=task.company_id,
        asset_id=task.asset_id,
        template_id=task.template_id,
        task_name=task.task_name,
        interval_km=task.interval_km,
        interval_days=task.interval_days,
        due_date=task.due_date,
        due_km=task.due_km,
        last_done_date=task.last_done_date,
        last_done_km=task.last_done_km,
        status=task.status,
        created_at=task.created_at,
        asset_name=asset.name,
        asset_plate=asset.plate,
        asset_km=asset.km_current,
    )


# ─── READ (all authenticated users) ─────────────────────────────

@router.get("/tasks", response_model=MaintenanceTaskList)
def list_tasks(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    asset_id: int | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    q = db.query(MaintenanceTask).filter(
        MaintenanceTask.company_id == company_id,
        MaintenanceTask.is_deleted.is_(False),
    )
    if asset_id:
        q = q.filter(MaintenanceTask.asset_id == asset_id)
    if status:
        q = q.filter(MaintenanceTask.status == status.upper())

    total = q.count()
    tasks = q.order_by(MaintenanceTask.due_date.asc().nullslast(), MaintenanceTask.id).offset(offset).limit(limit).all()
    has_more = offset + limit < total

    # Enrich with asset info
    asset_ids = {t.asset_id for t in tasks}
    assets_map = {}
    if asset_ids:
        assets_list = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        assets_map = {a.id: a for a in assets_list}

    data = []
    for t in tasks:
        asset = assets_map.get(t.asset_id)
        if asset:
            data.append(_enrich_task(t, asset))

    return {"data": data, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}


@router.get("/tasks/overview", response_model=MaintenanceTasksOverview)
def tasks_overview(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    today = date.today()

    all_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.company_id == company_id,
        MaintenanceTask.is_deleted.is_(False),
    ).all()

    # Recalculate statuses
    asset_ids = {t.asset_id for t in all_tasks}
    assets_map = {}
    if asset_ids:
        assets_list = db.query(Asset).filter(Asset.id.in_(asset_ids), Asset.is_deleted.is_(False)).all()
        assets_map = {a.id: a for a in assets_list}

    for t in all_tasks:
        asset = assets_map.get(t.asset_id)
        if asset:
            _recalculate_status(t, asset.km_current, today)

    db.commit()

    # Build response
    overdue = []
    due_7d = []
    due_30d = []

    for t in all_tasks:
        asset = assets_map.get(t.asset_id)
        if not asset:
            continue
        out = _enrich_task(t, asset)

        if t.status == "OVERDUE":
            overdue.append(out)
        elif t.status == "DUE":
            due_7d.append(out)
        elif t.status == "PENDING":
            # Check if due within 30 days
            if t.due_date and t.due_date <= today + timedelta(days=30):
                due_30d.append(out)
            elif t.due_km and asset.km_current and (t.due_km - asset.km_current) <= 2000:
                due_30d.append(out)

    return MaintenanceTasksOverview(
        overdue=overdue,
        due_soon_7d=due_7d,
        due_soon_30d=due_30d,
        total_tasks=len(all_tasks),
        total_overdue=len(overdue),
        total_due=len(due_7d),
    )


# ─── WRITE (manager/admin) ──────────────────────────────────────

@write_router.post("/tasks/generate/{asset_id}")
def generate_tasks(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    """Génère les tâches de maintenance pour un véhicule depuis les templates de son modèle."""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")
    if not asset.model_name:
        raise HTTPException(status_code=400, detail="Aucun modèle défini sur ce véhicule")

    templates = db.query(MaintenanceTemplate).filter(
        MaintenanceTemplate.company_id == company_id,
        MaintenanceTemplate.model_name == asset.model_name,
        MaintenanceTemplate.is_deleted.is_(False),
    ).all()

    if not templates:
        raise HTTPException(status_code=404, detail=f"Aucun plan de maintenance pour le modèle '{asset.model_name}'")

    # Check existing tasks
    existing = db.query(MaintenanceTask).filter(
        MaintenanceTask.asset_id == asset_id,
        MaintenanceTask.is_deleted.is_(False),
    ).all()
    existing_keys = {(t.template_id, t.task_name) for t in existing}

    today = date.today()
    created = 0

    for tmpl in templates:
        if (tmpl.id, tmpl.task_name) in existing_keys:
            continue

        due_date = (today + timedelta(days=tmpl.interval_days)) if tmpl.interval_days else None
        due_km = ((asset.km_current or 0) + tmpl.interval_km) if tmpl.interval_km else None

        task = MaintenanceTask(
            company_id=company_id,
            asset_id=asset_id,
            template_id=tmpl.id,
            task_name=tmpl.task_name,
            interval_km=tmpl.interval_km,
            interval_days=tmpl.interval_days,
            due_date=due_date,
            due_km=due_km,
            status="PENDING",
        )
        db.add(task)
        created += 1

    db.commit()
    return {"created": created, "total_templates": len(templates)}


@write_router.post("/tasks/{task_id}/complete")
def complete_task(
    task_id: int,
    payload: MaintenanceTaskComplete,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
):
    """Marque une tâche comme effectuée et planifie le prochain cycle."""
    task = db.query(MaintenanceTask).filter(
        MaintenanceTask.id == task_id,
        MaintenanceTask.company_id == company_id,
        MaintenanceTask.is_deleted.is_(False),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    # Create maintenance log
    log = MaintenanceLog(
        company_id=company_id,
        asset_id=task.asset_id,
        task_id=task.id,
        task_name=task.task_name,
        performed_at=payload.performed_at,
        km_at=payload.km_at,
        performed_by=current_user.id,
        notes=payload.notes,
        cost=payload.cost,
    )
    db.add(log)

    # Update task: record completion and schedule next cycle
    task.last_done_date = payload.performed_at
    task.last_done_km = payload.km_at

    task.due_date = (payload.performed_at + timedelta(days=task.interval_days)) if task.interval_days else None
    task.due_km = ((payload.km_at or 0) + task.interval_km) if task.interval_km else None
    task.status = "PENDING"

    # Update asset km if provided
    asset = db.query(Asset).filter(Asset.id == task.asset_id).first()
    if asset and payload.km_at is not None:
        if asset.km_current is None or payload.km_at > asset.km_current:
            asset.km_current = payload.km_at

    db.commit()
    return {"ok": True}


@write_router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    task = db.query(MaintenanceTask).filter(
        MaintenanceTask.id == task_id,
        MaintenanceTask.company_id == company_id,
        MaintenanceTask.is_deleted.is_(False),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")

    task.is_deleted = True
    db.commit()
    return {"ok": True}


# ─── KM UPDATE (all authenticated users) ────────────────────────

@router.patch("/km/{asset_id}")
def update_km(
    asset_id: int,
    payload: KmUpdate,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    """Met à jour le km d'un véhicule et recalcule les statuts des tâches."""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")

    asset.km_current = payload.km

    # Recalculate all task statuses for this asset
    today = date.today()
    tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.asset_id == asset_id,
        MaintenanceTask.is_deleted.is_(False),
    ).all()

    for t in tasks:
        _recalculate_status(t, payload.km, today)

    db.commit()
    return {"ok": True, "km": payload.km}
