from datetime import date, datetime

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.audit_context import cv_company_id, cv_ip, cv_request_id, cv_user_id
from app.core.audit_policy import sanitize, hash_ip
from app.core.config import settings
from app.models.audit_log import AuditLog


# Quels modèles on audite automatiquement
AUDITED_ENTITY_TYPES: dict[type, str] = {}  # rempli dans register_audit_models()


def register_audit_models(*models: type) -> None:
    for m in models:
        AUDITED_ENTITY_TYPES[m] = m.__name__.upper()


def _json_safe(value):
    """Convert non-JSON-serializable types (date, datetime) to ISO strings."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def _serialize_model(obj) -> dict:
    # on sérialise "simple" sans relations
    mapper = inspect(obj).mapper
    data = {}
    for col in mapper.columns:
        k = col.key
        try:
            data[k] = _json_safe(getattr(obj, k))
        except Exception:
            data[k] = None
    return data


def _is_deleted_action(obj) -> bool:
    # soft-delete : is_deleted True
    if hasattr(obj, "is_deleted"):
        try:
            return bool(getattr(obj, "is_deleted"))
        except Exception:
            return False
    return False


def audit_before_flush(session: Session, flush_context, instances) -> None:
    company_id = cv_company_id.get()
    user_id = cv_user_id.get()
    request_id = cv_request_id.get()
    ip = hash_ip(cv_ip.get(), salt=(settings.AUDIT_IP_SALT or settings.JWT_SECRET))

    if company_id is None:
        # requêtes publiques / sans token => on ne log pas
        return

    # 1) CREATE
    for obj in session.new:
        t = type(obj)
        if t not in AUDITED_ENTITY_TYPES:
            continue
        entity_type = AUDITED_ENTITY_TYPES[t]

        after = sanitize(entity_type, _serialize_model(obj))
        log = AuditLog(
            company_id=company_id,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=after.get("id") or 0,  # id pas encore assigné -> on corrige après flush
            action="CREATE",
            before=None,
            after=after,
            request_id=request_id,
            ip=ip,
        )
        session.add(log)

    # 2) UPDATE (+ soft delete -> DELETE)
    for obj in session.dirty:
        if not session.is_modified(obj, include_collections=False):
            continue
        t = type(obj)
        if t not in AUDITED_ENTITY_TYPES:
            continue

        insp = inspect(obj)
        entity_type = AUDITED_ENTITY_TYPES[t]

        # Build "after" from current state
        after = _serialize_model(obj)

        # Build "before" from current state, then overlay historical values
        before = dict(after)
        for attr in insp.mapper.column_attrs:
            hist = insp.attrs[attr.key].history
            if hist.has_changes() and hist.deleted:
                before[attr.key] = _json_safe(hist.deleted[0])

        before = sanitize(entity_type, before)
        after = sanitize(entity_type, after)

        action = "DELETE" if _is_deleted_action(obj) else "UPDATE"

        log = AuditLog(
            company_id=company_id,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=after.get("id") or 0,
            action=action,
            before=before,
            after=after,
            request_id=request_id,
            ip=ip,
        )
        session.add(log)

    # 3) Hard DELETE
    for obj in session.deleted:
        t = type(obj)
        if t not in AUDITED_ENTITY_TYPES:
            continue
        entity_type = AUDITED_ENTITY_TYPES[t]
        before = sanitize(entity_type, before)

        log = AuditLog(
            company_id=company_id,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=before.get("id") or 0,
            action="DELETE",
            before=before,
            after=None,
            request_id=request_id,
            ip=ip,
        )
        session.add(log)