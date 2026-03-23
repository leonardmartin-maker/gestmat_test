from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, and_
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db, get_current_user
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryOut

router = APIRouter()


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
    site_id: Optional[int] = Query(None),
):
    # Manager scoping
    if current_user.role == "MANAGER" and current_user.site_id and site_id is None:
        site_id = current_user.site_id

    since = datetime.now(timezone.utc) - timedelta(days=7)

    # Build base conditions for assets
    asset_base = [Asset.company_id == company_id, Asset.is_deleted.is_(False)]
    emp_base = [Employee.company_id == company_id, Employee.is_deleted.is_(False)]

    if site_id is not None:
        asset_base.append(Asset.site_id == site_id)
        emp_base.append(Employee.site_id == site_id)

    stmt = select(
        # assets (exclude deleted)
        select(func.count())
        .where(and_(*asset_base))
        .scalar_subquery()
        .label("total_assets"),
        select(func.count())
        .where(and_(*asset_base, Asset.status == "ASSIGNED"))
        .scalar_subquery()
        .label("assigned_assets"),
        select(func.count())
        .where(and_(*asset_base, Asset.status == "AVAILABLE"))
        .scalar_subquery()
        .label("available_assets"),
        select(func.count())
        .where(and_(*asset_base, Asset.status == "MAINTENANCE"))
        .scalar_subquery()
        .label("maintenance_assets"),
        select(func.count())
        .where(and_(*asset_base, Asset.status == "RETIRED"))
        .scalar_subquery()
        .label("retired_assets"),

        # employees (exclude deleted)
        select(func.count())
        .where(and_(*emp_base, Employee.active.is_(True)))
        .scalar_subquery()
        .label("active_employees"),
        select(func.count())
        .where(and_(*emp_base, Employee.active.is_(False)))
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