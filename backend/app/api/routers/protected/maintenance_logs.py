from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.models.maintenance_log import MaintenanceLog
from app.models.user import User
from app.schemas.common import Meta
from app.schemas.maintenance_log import MaintenanceLogList, MaintenanceLogOut

router = APIRouter()


@router.get("/asset/{asset_id}", response_model=MaintenanceLogList)
def get_asset_logs(
    asset_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(MaintenanceLog).filter(
        MaintenanceLog.company_id == company_id,
        MaintenanceLog.asset_id == asset_id,
    )
    total = q.count()
    logs = q.order_by(MaintenanceLog.performed_at.desc(), MaintenanceLog.id.desc()).offset(offset).limit(limit).all()
    has_more = offset + limit < total

    # Enrich with performer name
    user_ids = {log.performed_by for log in logs if log.performed_by}
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u.email for u in users}

    data = []
    for log in logs:
        out = MaintenanceLogOut(
            id=log.id,
            company_id=log.company_id,
            asset_id=log.asset_id,
            task_id=log.task_id,
            task_name=log.task_name,
            performed_at=log.performed_at,
            km_at=log.km_at,
            performed_by=log.performed_by,
            performer_name=users_map.get(log.performed_by) if log.performed_by else None,
            notes=log.notes,
            cost=float(log.cost) if log.cost is not None else None,
            created_at=log.created_at,
        )
        data.append(out)

    return {"data": data, "meta": Meta(limit=limit, offset=offset, total=total, has_more=has_more)}
