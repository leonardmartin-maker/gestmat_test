from sqlalchemy import String, DateTime, Integer, Date, Text, Numeric, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("maintenance_tasks.id"), nullable=True, index=True)

    task_name: Mapped[str] = mapped_column(String(200))           # dénormalisé
    performed_at: Mapped[Date] = mapped_column(Date, nullable=False)
    km_at: Mapped[int | None] = mapped_column(Integer, nullable=True)
    performed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<MaintenanceLog id={self.id} "
            f"task='{self.task_name}' "
            f"performed_at={self.performed_at} "
            f"asset_id={self.asset_id}>"
        )
