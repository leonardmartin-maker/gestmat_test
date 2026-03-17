from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    total_assets: int
    assigned_assets: int
    available_assets: int
    maintenance_assets: int
    retired_assets: int

    active_employees: int
    inactive_employees: int

    last_7_days_events: int