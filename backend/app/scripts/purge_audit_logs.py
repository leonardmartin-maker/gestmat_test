from datetime import datetime, timedelta, timezone

from app.db.session import SessionLocal
from app.core.config import settings
from app.models.audit_log import AuditLog

def run():
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.AUDIT_RETENTION_DAYS)
    db = SessionLocal()
    try:
        deleted = (
            db.query(AuditLog)
            .filter(AuditLog.created_at < cutoff)
            .delete(synchronize_session=False)
        )
        db.commit()
        print(f"Purged audit_logs: {deleted} rows (cutoff={cutoff.isoformat()})")
    finally:
        db.close()

if __name__ == "__main__":
    run()