from sqlalchemy import String, DateTime, Float, Integer, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class GpsDevice(Base):
    __tablename__ = "gps_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), unique=True, index=True)

    imei: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    device_model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relay state: ON (immobilized), OFF (can start), UNKNOWN
    relay_state: Mapped[str] = mapped_column(String(10), nullable=False, server_default="UNKNOWN")

    # Last known state
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    last_connected_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_speed: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<GpsDevice id={self.id} imei={self.imei} asset_id={self.asset_id}>"
