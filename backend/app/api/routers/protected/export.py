import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_company_id, get_db
from app.core.permissions import require_manager_or_admin
from app.models.asset import Asset
from app.models.employee import Employee

router = APIRouter(dependencies=[Depends(require_manager_or_admin)])

ASSET_COLUMNS = [
    "id", "category", "name", "ref", "status", "public_id",
    "plate", "km_current", "insurance_date", "inspection_date",
    "epi_type", "serial_number", "next_inspection_date", "notes",
    "created_at",
]

EMPLOYEE_COLUMNS = [
    "id", "first_name", "last_name", "employee_code", "active", "created_at",
]


@router.get("/assets.csv")
def export_assets_csv(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    status: str | None = None,
    category: str | None = None,
):
    q = db.query(Asset).filter(
        Asset.company_id == company_id,
        Asset.is_deleted.is_(False),
    )
    if status:
        q = q.filter(Asset.status == status)
    if category:
        q = q.filter(Asset.category == category)

    assets = q.order_by(Asset.id).all()

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(ASSET_COLUMNS)

    for a in assets:
        writer.writerow([_fmt(getattr(a, col, None)) for col in ASSET_COLUMNS])

    buf.seek(0)
    filename = f"assets_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/employees.csv")
def export_employees_csv(
    db: Session = Depends(get_db),
    company_id: int = Depends(get_company_id),
    active: bool | None = None,
):
    q = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.is_deleted.is_(False),
    )
    if active is not None:
        q = q.filter(Employee.active == active)

    employees = q.order_by(Employee.id).all()

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(EMPLOYEE_COLUMNS)

    for e in employees:
        writer.writerow([_fmt(getattr(e, col, None)) for col in EMPLOYEE_COLUMNS])

    buf.seek(0)
    filename = f"employees_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _fmt(val):
    if val is None:
        return ""
    if isinstance(val, bool):
        return "oui" if val else "non"
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M")
    return str(val)
