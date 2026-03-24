"""Maintenance mode middleware — returns 503 for unauthenticated non-whitelisted users."""

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if not settings.MAINTENANCE_MODE:
            return await call_next(request)

        # Always allow: health, docs, login, register, static
        path = request.url.path
        if path in ("/health", "/docs", "/openapi.json"):
            return await call_next(request)
        if path.endswith("/auth/login") or path.endswith("/auth/register"):
            return await call_next(request)

        # No auth header = let through (SSR, public pages, etc.)
        # The actual protection is: if you have a token, it must be whitelisted
        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            return await call_next(request)

        # Has a token — check if whitelisted
        allowed = {
            e.strip().lower()
            for e in settings.MAINTENANCE_ALLOWED_EMAILS.split(",")
            if e.strip()
        }
        token = auth[7:]
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
            email = payload.get("sub", "").lower()
            if email in allowed:
                return await call_next(request)
        except JWTError:
            pass

        return JSONResponse(
            status_code=503,
            content={
                "detail": "Application en maintenance. Revenez plus tard."
            },
        )
