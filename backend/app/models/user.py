from sqlalchemy import String, DateTime, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    site_id: Mapped[int | None] = mapped_column(ForeignKey("sites.id"), nullable=True, index=True)

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="ADMIN")  # ADMIN/MANAGER/EMPLOYEE
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true", index=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<User id={self.id} "
            f"email='{self.email}' "
            f"company_id={self.company_id} "
            f"role={self.role}>"
        )    