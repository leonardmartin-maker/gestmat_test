from sqlalchemy import String, Boolean, DateTime, Integer, Date, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("maintenance_templates.id"), nullable=True, index=True)

    task_name: Mapped[str] = mapped_column(String(200))
    interval_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Computed: next due
    due_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    due_km: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Last completion
    last_done_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    last_done_km: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # PENDING / DUE / OVERDUE
    status: Mapped[str] = mapped_column(String(20), default="PENDING")

    # Soft-delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", index=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<MaintenanceTask id={self.id} "
            f"task='{self.task_name}' "
            f"status={self.status} "
            f"asset_id={self.asset_id}>"
        )
