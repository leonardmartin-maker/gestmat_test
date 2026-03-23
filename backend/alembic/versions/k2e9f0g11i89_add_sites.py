"""Add sites table and site_id to assets, employees, users.

Revision ID: k2e9f0g11i89
Revises: j1d8e9f10h78
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k2e9f0g11i89"
down_revision: Union[str, None] = "j1d8e9f10h78"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sites table
    op.create_table(
        "sites",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # 2. Add nullable site_id FK to assets, employees, users
    op.add_column("assets", sa.Column("site_id", sa.Integer, sa.ForeignKey("sites.id"), nullable=True))
    op.create_index("ix_assets_site_id", "assets", ["site_id"])

    op.add_column("employees", sa.Column("site_id", sa.Integer, sa.ForeignKey("sites.id"), nullable=True))
    op.create_index("ix_employees_site_id", "employees", ["site_id"])

    op.add_column("users", sa.Column("site_id", sa.Integer, sa.ForeignKey("sites.id"), nullable=True))
    op.create_index("ix_users_site_id", "users", ["site_id"])


def downgrade() -> None:
    op.drop_index("ix_users_site_id", table_name="users")
    op.drop_column("users", "site_id")

    op.drop_index("ix_employees_site_id", table_name="employees")
    op.drop_column("employees", "site_id")

    op.drop_index("ix_assets_site_id", table_name="assets")
    op.drop_column("assets", "site_id")

    op.drop_table("sites")
