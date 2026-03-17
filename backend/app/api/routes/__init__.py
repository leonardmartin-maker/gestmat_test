from fastapi import APIRouter

from .health import router as health
from .auth import router as auth
from .employees import router as employees
from .assets import router as assets
from .scan import router as scan
from .me import router as me

api_router = APIRouter()

api_router.include_router(health)
api_router.include_router(auth)
api_router.include_router(me)
api_router.include_router(employees)
api_router.include_router(assets)
api_router.include_router(scan)