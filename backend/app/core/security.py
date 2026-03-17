from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(
    subject: str,
    extra: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT access token.

    :param subject: user identifier (stored in 'sub')
    :param extra: optional additional claims (e.g. role, company_id)
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),   # issued at
        "exp": int(expire.timestamp()),  # expiration (timestamp)
    }

    if extra:
        payload.update(extra)

    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )