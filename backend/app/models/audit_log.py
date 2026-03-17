# app/models/audit_log.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id"), nullable=True, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )

    # nullable pour actions SYSTEM/AUTH/EXPORT etc
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # RGPD: sanitized/minimal
    before: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    after: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)  # idéalement hashé

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )


# -----------------------
# RGPD sanitization helper
# -----------------------

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "jwt",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "api_key",
    "authorization",
}

PII_KEYS = {"email", "phone", "first_name", "last_name"}  # à adapter


def sanitize(obj: dict[str, Any] | None) -> dict[str, Any] | None:
    if obj is None:
        return None

    out: dict[str, Any] = {}
    for k, v in obj.items():
        lk = k.lower()
        if lk in SENSITIVE_KEYS:
            continue
        if lk in PII_KEYS:
            out[k] = "***"
        else:
            out[k] = v
    return out