from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.models.asset import Asset
from app.schemas.asset import AssetOut

router = APIRouter()


class MaintenanceOverview(BaseModel):
    overdue: list[AssetOut]
    upcoming_7d: list[AssetOut]
    upcoming_30d: list[AssetOut]
    in_maintenance: list[AssetOut]
    insurance_expiring: list[AssetOut]


@router.get("/overview", response_model=MaintenanceOverview)
def maintenance_overview(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
):
    today = date.today()
    d7 = today + timedelta(days=7)
    d30 = today + timedelta(days=30)

    active = (
        db.query(Asset)
        .filter(Asset.company_id == company_id, Asset.is_deleted.is_(False))
        .all()
    )

    overdue = []
    upcoming_7d = []
    upcoming_30d = []
    in_maintenance = []
    insurance_expiring = []

    for a in active:
        if a.status == "MAINTENANCE":
            in_maintenance.append(a)

        nid = a.next_inspection_date
        if nid:
            if nid < today:
                overdue.append(a)
            elif nid <= d7:
                upcoming_7d.append(a)
            elif nid <= d30:
                upcoming_30d.append(a)

        if a.insurance_date and a.insurance_date < d30:
            insurance_expiring.append(a)

    overdue.sort(key=lambda x: x.next_inspection_date or today)
    upcoming_7d.sort(key=lambda x: x.next_inspection_date or today)
    upcoming_30d.sort(key=lambda x: x.next_inspection_date or today)

    return MaintenanceOverview(
        overdue=overdue,
        upcoming_7d=upcoming_7d,
        upcoming_30d=upcoming_30d,
        in_maintenance=in_maintenance,
        insurance_expiring=insurance_expiring,
    )
