from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException, status

from app.core.deps import get_current_user
from app.models.user import User


# Optionnel mais "pro" : évite les typos
ROLE_ADMIN = "ADMIN"
ROLE_MANAGER = "MANAGER"
ROLE_EMPLOYEE = "EMPLOYEE"


def require_roles(*roles: str) -> Callable[[User], User]:
    allowed = set(roles)

    def _dep(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            # détail clair pour le front
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "forbidden",
                    "message": "Permissions insuffisantes",
                    "required_roles": sorted(allowed),
                    "current_role": current_user.role,
                },
            )
        return current_user

    return _dep


# Ready-to-use deps
require_admin = require_roles(ROLE_ADMIN)
require_manager_or_admin = require_roles(ROLE_ADMIN, ROLE_MANAGER)