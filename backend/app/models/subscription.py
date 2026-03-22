"""Subscription & plan models for multi-tenant SaaS."""

from sqlalchemy import String, DateTime, Integer, Numeric, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # TRIAL, PRO_PME, PRO_PME_PLUS, ENTERPRISE
    name: Mapped[str] = mapped_column(String(100))
    price_chf: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    extra_employee_price_chf: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    max_employees: Mapped[int] = mapped_column(Integer, default=3)
    max_vehicles: Mapped[int] = mapped_column(Integer, default=3)
    max_assets: Mapped[int] = mapped_column(Integer, default=3)

    trial_days: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), unique=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), index=True)

    status: Mapped[str] = mapped_column(String(30), default="TRIAL")  # TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED

    trial_ends_at = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_start = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end = mapped_column(DateTime(timezone=True), nullable=True)

    extra_employees: Mapped[int] = mapped_column(Integer, default=0)

    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
