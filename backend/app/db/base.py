# Re-export Base from base_class for backward compatibility.
# All models should use app.db.base_class.Base directly.

from app.db.base_class import Base  # noqa: F401
