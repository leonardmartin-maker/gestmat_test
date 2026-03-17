# app/core/middleware/audit.py

import hmac
import hashlib
import secrets
from typing import Optional

from fastapi import Request
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.audit_context import clear_audit_context, set_audit_context
from app.core.config import settings
from app.core.deps import bearer_scheme


def _client_ip(request: Request) -> Optional[str]:
    """
    ⚠️ X-Forwarded-For est spoofable si ton API est exposée directement.
    On ne l’utilise que si tu SAIS être derrière un reverse-proxy (Cloudflare, Traefik, Nginx, etc.).
    Ici on le garde simple mais tu peux conditionner via ENV (ex: TRUST_PROXY=true).
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()

    return request.client.host if request.client else None


def _hash_ip(ip: Optional[str]) -> Optional[str]:
    """
    RGPD: on stocke un identifiant pseudonymisé, stable (pour détection d’abus),
    mais irréversible sans le salt.
    """
    if not ip:
        return None

    salt = getattr(settings, "AUDIT_IP_SALT", None)
    if not salt:
        # si pas de salt, mieux vaut ne rien logger plutôt que stocker l'IP brute
        return None

    # HMAC-SHA256(salt, ip)
    digest = hmac.new(salt.encode("utf-8"), ip.encode("utf-8"), hashlib.sha256).hexdigest()
    return digest


class AuditContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or secrets.token_hex(8)

        ip_raw = _client_ip(request)
        ip_hash = _hash_ip(ip_raw)

        company_id: int | None = None
        user_id: int | None = None

        # JWT optionnel: on lit si présent, sans forcer l'auth
        try:
            creds = await bearer_scheme(request)  # auto_error=False => None si pas de token
            token = creds.credentials if creds else None

            if token:
                payload = jwt.decode(
                    token,
                    settings.JWT_SECRET,
                    algorithms=[settings.JWT_ALGORITHM],
                )
                sub = payload.get("sub")
                cid = payload.get("cid")

                if sub is not None:
                    user_id = int(sub)
                if cid is not None:
                    company_id = int(cid)

        except (JWTError, ValueError, TypeError):
            # Token invalide => audit anonymous; l'auth des routes gère le 401
            pass

        set_audit_context(
            company_id=company_id,
            user_id=user_id,
            request_id=request_id,
            ip=ip_hash,  # ✅ hash RGPD
        )

        try:
            response = await call_next(request)
            response.headers["x-request-id"] = request_id
            return response
        finally:
            clear_audit_context()