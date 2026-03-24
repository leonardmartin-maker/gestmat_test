"""Maintenance mode middleware — returns 503 for all requests except whitelisted users."""

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if not settings.MAINTENANCE_MODE:
            return await call_next(request)

        # Always allow health check
        if request.url.path in ("/health", "/docs", "/openapi.json"):
            return await call_next(request)

        # Allow login endpoint so whitelisted users can authenticate
        if request.url.path.endswith("/auth/login"):
            return await call_next(request)

        # Check JWT for whitelisted email
        allowed = {
            e.strip().lower()
            for e in settings.MAINTENANCE_ALLOWED_EMAILS.split(",")
            if e.strip()
        }
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
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
