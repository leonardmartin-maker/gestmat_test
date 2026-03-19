from sqlalchemy import String, Boolean, DateTime, JSON, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class EpiCategory(Base):
    __tablename__ = "epi_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)

    name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    enabled_attributes: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Soft-delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", index=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<EpiCategory id={self.id} "
            f"name='{self.name}' "
            f"company_id={self.company_id}>"
        )
