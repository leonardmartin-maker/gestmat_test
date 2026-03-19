"""add maintenance_templates, maintenance_tasks, maintenance_logs tables

Revision ID: f7a4b5c06d34
Revises: e6c3d4a05b23
Create Date: 2026-03-18 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7a4b5c06d34"
down_revision: Union[str, None] = "e6c3d4a05b23"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- maintenance_templates ---
    op.create_table(
        "maintenance_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False, index=True),
        sa.Column("model_name", sa.String(100), nullable=False),
        sa.Column("task_name", sa.String(200), nullable=False),
        sa.Column("interval_km", sa.Integer(), nullable=True),
        sa.Column("interval_days", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- maintenance_tasks ---
    op.create_table(
        "maintenance_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False, index=True),
        sa.Column("asset_id", sa.Integer(), sa.ForeignKey("assets.id"), nullable=False, index=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("maintenance_templates.id"), nullable=True, index=True),
        sa.Column("task_name", sa.String(200), nullable=False),
        sa.Column("interval_km", sa.Integer(), nullable=True),
        sa.Column("interval_days", sa.Integer(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("due_km", sa.Integer(), nullable=True),
        sa.Column("last_done_date", sa.Date(), nullable=True),
        sa.Column("last_done_km", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- maintenance_logs ---
    op.create_table(
        "maintenance_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False, index=True),
        sa.Column("asset_id", sa.Integer(), sa.ForeignKey("assets.id"), nullable=False, index=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("maintenance_tasks.id"), nullable=True, index=True),
        sa.Column("task_name", sa.String(200), nullable=False),
        sa.Column("performed_at", sa.Date(), nullable=False),
        sa.Column("km_at", sa.Integer(), nullable=True),
        sa.Column("performed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- Add model_name to assets ---
    op.add_column("assets", sa.Column("model_name", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("assets", "model_name")
    op.drop_table("maintenance_logs")
    op.drop_table("maintenance_tasks")
    op.drop_table("maintenance_templates")
