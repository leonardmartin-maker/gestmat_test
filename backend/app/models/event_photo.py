from sqlalchemy import String, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class EventPhoto(Base):
    __tablename__ = "event_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(20))  # STATE / DAMAGE
    file_path: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<EventPhoto id={self.id} event_id={self.event_id} category={self.category}>"
