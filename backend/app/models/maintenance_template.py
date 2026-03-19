from sqlalchemy import String, Boolean, DateTime, Integer, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class MaintenanceTemplate(Base):
    __tablename__ = "maintenance_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)

    model_name: Mapped[str] = mapped_column(String(100))          # ex: "Honda PCX 125"
    task_name: Mapped[str] = mapped_column(String(200))            # ex: "Vidange huile moteur"
    interval_km: Mapped[int | None] = mapped_column(Integer, nullable=True)   # ex: 6000
    interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # ex: 180

    # Soft-delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", index=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<MaintenanceTemplate id={self.id} "
            f"model='{self.model_name}' "
            f"task='{self.task_name}' "
            f"company_id={self.company_id}>"
        )
