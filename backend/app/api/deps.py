# Shim compat: anciens imports app.api.deps.* continuent de marcher
from app.core.deps import get_db, get_current_user, get_company_id  # noqa: F401