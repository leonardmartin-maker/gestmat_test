from fastapi import APIRouter, Depends

from app.core.deps import get_current_user

from app.api.routers.public import auth, health, scan as public_scan, stripe_webhook
from app.api.routers.protected import me, employees, assets, scan, events, dashboard, audit_logs, export, users, maintenance, epi_categories, maintenance_templates, maintenance_tasks, maintenance_logs, fuel_receipts, incidents, subscription, sites, gps_devices

api_router = APIRouter()

# Public
public_router = APIRouter()
public_router.include_router(auth.router, prefix="/auth", tags=["auth"])
public_router.include_router(health.router, tags=["health"])
public_router.include_router(stripe_webhook.router, tags=["stripe"])
# public_scan moved to protected_router as employee-scan (auth required)

# Protected (JWT requis)
protected_router = APIRouter(dependencies=[Depends(get_current_user)])

# USER / MANAGER
protected_router.include_router(me.router, tags=["me"])

# Employees
protected_router.include_router(employees.router, prefix="/employees", tags=["employees"])
# ⚠️ Si tu utilises la version G pour employees.py, décommente :
protected_router.include_router(employees.write_router, prefix="/employees", tags=["employees"])

# Assets
protected_router.include_router(assets.router, prefix="/assets", tags=["assets"])
protected_router.include_router(assets.write_router, prefix="/assets", tags=["assets"])  # ✅ MANAGER/ADMIN write

# Scan / Events / Dashboard
protected_router.include_router(scan.router, prefix="/scan", tags=["scan"])
protected_router.include_router(events.router, prefix="/events", tags=["events"])
protected_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# ADMIN ZONE
protected_router.include_router(
    employees.admin_router,
    prefix="/admin/employees",
    tags=["admin-employees"],
)

protected_router.include_router(
    assets.admin_router,
    prefix="/admin/assets",
    tags=["admin-assets"],
)

protected_router.include_router(
    audit_logs.router,
    prefix="/admin/audit-logs",
    tags=["admin-audit-logs"],
)

# Users (ADMIN)
protected_router.include_router(users.router, prefix="/admin/users", tags=["admin-users"])

# EPI Categories
protected_router.include_router(epi_categories.router, prefix="/epi-categories", tags=["epi-categories"])
protected_router.include_router(epi_categories.admin_router, prefix="/admin/epi-categories", tags=["admin-epi-categories"])

# Sites / Depots
protected_router.include_router(sites.router, prefix="/sites", tags=["sites"])
protected_router.include_router(sites.admin_router, prefix="/admin/sites", tags=["admin-sites"])

# Maintenance (legacy overview)
protected_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])

# Maintenance Templates (ADMIN)
protected_router.include_router(
    maintenance_templates.admin_router,
    prefix="/admin/maintenance-templates",
    tags=["admin-maintenance-templates"],
)

# Maintenance Tasks (read: all, write: manager/admin)
protected_router.include_router(maintenance_tasks.router, prefix="/maintenance", tags=["maintenance-tasks"])
protected_router.include_router(maintenance_tasks.write_router, prefix="/maintenance", tags=["maintenance-tasks"])

# Maintenance Logs (read: all)
protected_router.include_router(maintenance_logs.router, prefix="/maintenance/logs", tags=["maintenance-logs"])

# Export CSV (MANAGER/ADMIN)
protected_router.include_router(export.router, prefix="/export", tags=["export"])

# Fuel receipts (upload: any, manage: manager/admin)
protected_router.include_router(fuel_receipts.router, prefix="/fuel-receipts", tags=["fuel-receipts"])
protected_router.include_router(fuel_receipts.write_router, prefix="/fuel-receipts", tags=["fuel-receipts"])

# Incidents (declare: any, manage: manager/admin)
protected_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
protected_router.include_router(incidents.write_router, prefix="/incidents", tags=["incidents"])

# Subscription / billing
protected_router.include_router(subscription.router, prefix="/subscription", tags=["subscription"])
protected_router.include_router(subscription.admin_router, prefix="/subscription", tags=["subscription"])

# GPS Devices
protected_router.include_router(gps_devices.router, prefix="/gps-devices", tags=["gps-devices"])
protected_router.include_router(gps_devices.admin_router, prefix="/admin/gps-devices", tags=["admin-gps-devices"])

# Employee self-service scan (authenticated — any role)
protected_router.include_router(public_scan.router, prefix="/employee-scan", tags=["employee-scan"])

api_router.include_router(public_router)
api_router.include_router(protected_router)