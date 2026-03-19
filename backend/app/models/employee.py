from sqlalchemy import String, Boolean, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)

    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    employee_code: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    # ✅ Soft-delete
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false", index=True)
    deleted_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self) -> str:
        return (
            f"<Employee id={self.id} "
            f"name='{self.first_name} {self.last_name}' "
            f"company_id={self.company_id} "
            f"active={self.active}>"
        )    