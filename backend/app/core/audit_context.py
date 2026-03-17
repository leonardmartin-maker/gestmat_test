# app/core/audit_context.py
import contextvars
from typing import Optional

cv_company_id: contextvars.ContextVar[Optional[int]] = contextvars.ContextVar("company_id", default=None)
cv_user_id: contextvars.ContextVar[Optional[int]] = contextvars.ContextVar("user_id", default=None)
cv_request_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("request_id", default=None)
cv_ip: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("ip", default=None)


def set_audit_context(*, company_id: Optional[int], user_id: Optional[int], request_id: Optional[str], ip: Optional[str]) -> None:
    cv_company_id.set(company_id)
    cv_user_id.set(user_id)
    cv_request_id.set(request_id)
    cv_ip.set(ip)


def clear_audit_context() -> None:
    set_audit_context(company_id=None, user_id=None, request_id=None, ip=None)


def get_company_id() -> Optional[int]:
    return cv_company_id.get()


def get_user_id() -> Optional[int]:
    return cv_user_id.get()


def get_request_id() -> Optional[str]:
    return cv_request_id.get()


def get_ip() -> Optional[str]:
    return cv_ip.get()