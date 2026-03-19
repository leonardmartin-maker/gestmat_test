from sqlalchemy import String, DateTime, func, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)

    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    event_type: Mapped[str] = mapped_column(String(30))  # CHECK_OUT / CHECK_IN / INSPECTION / ISSUE
    occurred_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    km_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    damage_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<Event id={self.id} "
            f"type={self.event_type} "
            f"asset_id={self.asset_id} "
            f"employee_id={self.employee_id} "
            f"user_id={self.user_id} "
            f"occurred_at={self.occurred_at}>"
        )    