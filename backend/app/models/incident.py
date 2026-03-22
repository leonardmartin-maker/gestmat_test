from sqlalchemy import String, DateTime, Integer, Text, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), index=True)

    # ACCIDENT | BREAKDOWN (panne)
    incident_type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Partie adverse (accident uniquement)
    has_third_party: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    third_party_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    third_party_plate: Mapped[str | None] = mapped_column(String(50), nullable=True)
    third_party_insurance: Mapped[str | None] = mapped_column(String(255), nullable=True)
    third_party_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # PENDING | IN_PROGRESS | RESOLVED
    status: Mapped[str] = mapped_column(String(20), default="PENDING")

    resolved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<Incident id={self.id} type={self.incident_type} status={self.status}>"


class IncidentPhoto(Base):
    __tablename__ = "incident_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    # DAMAGE | THIRD_PARTY_ID | THIRD_PARTY_VEHICLE
    category: Mapped[str] = mapped_column(String(30), nullable=False, server_default="DAMAGE")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
