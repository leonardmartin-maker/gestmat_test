"""Add plans and subscriptions tables + company SaaS fields.

Revision ID: g8a5b6c07e45
Revises: f7a4b5c06d34
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = "g8a5b6c07e45"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Company SaaS fields
    op.add_column("companies", sa.Column("slug", sa.String(100), nullable=True))
    op.add_column("companies", sa.Column("contact_email", sa.String(255), nullable=True))
    op.add_column("companies", sa.Column("phone", sa.String(50), nullable=True))
    op.add_column("companies", sa.Column("address", sa.String(500), nullable=True))
    op.add_column("companies", sa.Column("logo_path", sa.String(500), nullable=True))
    op.create_index("ix_companies_slug", "companies", ["slug"], unique=True)

    # Plans table
    op.create_table(
        "plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("price_chf", sa.Numeric(10, 2), server_default="0"),
        sa.Column("extra_employee_price_chf", sa.Numeric(10, 2), server_default="0"),
        sa.Column("max_employees", sa.Integer(), server_default="3"),
        sa.Column("max_vehicles", sa.Integer(), server_default="3"),
        sa.Column("max_assets", sa.Integer(), server_default="3"),
        sa.Column("trial_days", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("stripe_price_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_plans_code", "plans", ["code"], unique=True)

    # Subscriptions table
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("status", sa.String(30), server_default="TRIAL"),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_employees", sa.Integer(), server_default="0"),
        sa.Column("stripe_customer_id", sa.String(100), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subscriptions_company_id", "subscriptions", ["company_id"], unique=True)
    op.create_index("ix_subscriptions_plan_id", "subscriptions", ["plan_id"])

    # Seed default plans
    op.execute("""
        INSERT INTO plans (code, name, price_chf, extra_employee_price_chf, max_employees, max_vehicles, max_assets, trial_days)
        VALUES
            ('TRIAL', 'Essai gratuit', 0, 0, 3, 3, 3, 14),
            ('PRO_PME', 'Pro PME', 29, 1, 5, 10, 10, 0),
            ('PRO_PME_PLUS', 'Pro PME+', 49, 1, 20, 30, 30, 0),
            ('ENTERPRISE', 'Entreprise', 0, 0, 0, 0, 0, 0)
    """)

    # Create subscription for existing companies (set them as ACTIVE on PRO_PME_PLUS)
    op.execute("""
        INSERT INTO subscriptions (company_id, plan_id, status)
        SELECT c.id, p.id, 'ACTIVE'
        FROM companies c
        CROSS JOIN plans p
        WHERE p.code = 'PRO_PME_PLUS'
        AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.company_id = c.id)
    """)


def downgrade() -> None:
    op.drop_table("subscriptions")
    op.drop_table("plans")
    op.drop_index("ix_companies_slug", "companies")
    op.drop_column("companies", "slug")
    op.drop_column("companies", "contact_email")
    op.drop_column("companies", "phone")
    op.drop_column("companies", "address")
    op.drop_column("companies", "logo_path")
