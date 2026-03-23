from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

from sqlalchemy import event
from app.core.audit_listener import audit_before_flush, register_audit_models
from app.models.asset import Asset
from app.models.employee import Employee
from app.models.event import Event
from app.models.event_photo import EventPhoto  # noqa: F401 — ensure table is created
from app.models.gps_device import GpsDevice  # noqa: F401 — ensure table is created

# enregistrer les modèles audités
register_audit_models(Asset, Employee, Event)

# brancher le hook
event.listen(SessionLocal, "before_flush", audit_before_flush)