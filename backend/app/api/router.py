from fastapi import APIRouter, Depends

from app.core.deps import get_current_user

from app.api.routers.public import auth, health
from app.api.routers.protected import me, employees, assets, scan, events, dashboard, audit_logs, export, users, maintenance

api_router = APIRouter()

# Public
public_router = APIRouter()
public_router.include_router(auth.router, prefix="/auth", tags=["auth"])
public_router.include_router(health.router, tags=["health"])

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

# Maintenance
protected_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])

# Export CSV (MANAGER/ADMIN)
protected_router.include_router(export.router, prefix="/export", tags=["export"])

api_router.include_router(public_router)
api_router.include_router(protected_router)