from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.schemas.dashboard import DashboardSummaryOut

router = APIRouter()


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    since = datetime.now(timezone.utc) - timedelta(days=7)

    stmt = select(
        # assets (exclude deleted)
        select(func.count())
        .where(Asset.company_id == company_id, Asset.is_deleted.is_(False))
        .scalar_subquery()
        .label("total_assets"),
        select(func.count())
        .where(Asset.company_id == company_id, Asset.is_deleted.is_(False), Asset.status == "ASSIGNED")
        .scalar_subquery()
        .label("assigned_assets"),
        select(func.count())
        .where(Asset.company_id == company_id, Asset.is_deleted.is_(False), Asset.status == "AVAILABLE")
        .scalar_subquery()
        .label("available_assets"),
        select(func.count())
        .where(Asset.company_id == company_id, Asset.is_deleted.is_(False), Asset.status == "MAINTENANCE")
        .scalar_subquery()
        .label("maintenance_assets"),
        select(func.count())
        .where(Asset.company_id == company_id, Asset.is_deleted.is_(False), Asset.status == "RETIRED")
        .scalar_subquery()
        .label("retired_assets"),

        # employees (exclude deleted)
        select(func.count())
        .where(Employee.company_id == company_id, Employee.is_deleted.is_(False), Employee.active.is_(True))
        .scalar_subquery()
        .label("active_employees"),
        select(func.count())
        .where(Employee.company_id == company_id, Employee.is_deleted.is_(False), Employee.active.is_(False))
        .scalar_subquery()
        .label("inactive_employees"),

        # events (audit: we keep them all)
        select(func.count())
        .where(Event.company_id == company_id, Event.occurred_at >= since)
        .scalar_subquery()
        .label("last_7_days_events"),
    )

    row = db.execute(stmt).mappings().one()
    return DashboardSummaryOut(**row)