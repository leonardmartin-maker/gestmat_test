"""Maintenance mode middleware — returns 503 for unauthenticated non-whitelisted users."""

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


def _build_allowed_user_ids():
    """Resolve allowed emails to user IDs (cached on first call)."""
    from app.db.session import SessionLocal
    from app.models.user import User

    allowed_emails = {
        e.strip().lower()
        for e in settings.MAINTENANCE_ALLOWED_EMAILS.split(",")
        if e.strip()
    }
    if not allowed_emails:
        return set()

    db = SessionLocal()
    try:
        users = db.query(User.id).filter(User.email.in_(allowed_emails)).all()
        return {str(u.id) for u in users}
    finally:
        db.close()


class MaintenanceMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, **kwargs):
        super().__init__(app, **kwargs)
        self._allowed_ids: set[str] | None = None

    def _get_allowed_ids(self) -> set[str]:
        if self._allowed_ids is None:
            self._allowed_ids = _build_allowed_user_ids()
        return self._allowed_ids

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
        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            return await call_next(request)

        # Has a token — check if user ID is whitelisted
        allowed_ids = self._get_allowed_ids()
        token = auth[7:]
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("sub", "")
            if user_id in allowed_ids:
                return await call_next(request)
        except JWTError:
            pass

        return JSONResponse(
            status_code=503,
            content={
                "detail": "Application en maintenance. Revenez plus tard."
            },
        )
