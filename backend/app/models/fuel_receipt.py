from sqlalchemy import String, DateTime, Integer, Date, Numeric, Text, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class FuelReceipt(Base):
    __tablename__ = "fuel_receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)

    photo_path: Mapped[str] = mapped_column(String(500))
    amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    liters: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    tva_amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    tva_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    station_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    receipt_date: Mapped[Date] = mapped_column(Date, nullable=False)

    # PENDING / APPROVED / REJECTED
    status: Mapped[str] = mapped_column(String(20), default="PENDING")

    ocr_raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<FuelReceipt id={self.id} amount={self.amount} status={self.status}>"
