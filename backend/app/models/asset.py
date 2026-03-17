import secrets
from sqlalchemy import String, Date, DateTime, func, ForeignKey, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base

class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)

    category: Mapped[str] = mapped_column(String(20))  # VEHICLE / EPI
    name: Mapped[str] = mapped_column(String(200))
    ref: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")  # AVAILABLE/ASSIGNED/MAINTENANCE/RETIRED

    public_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, default=lambda: secrets.token_hex(8))

    # vehicle fields (nullable if EPI)
    plate: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    km_current: Mapped[int | None] = mapped_column(Integer, nullable=True)
    insurance_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    inspection_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    # EPI fields (nullable if vehicle)
    epi_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    next_inspection_date: Mapped[Date | None] = mapped_column(Date, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ✅ Soft-delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", index=True)
    deleted_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<Asset id={self.id} "
            f"category={self.category} "
            f"name='{self.name}' "
            f"status={self.status} "
            f"company_id={self.company_id}>"
        )    