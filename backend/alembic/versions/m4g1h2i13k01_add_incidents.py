"""Add incidents and incident_photos tables.

Revision ID: m4g1h2i13k01
Revises: l3f0g1h12j90
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


revision: str = "m4g1h2i13k01"
down_revision: Union[str, None] = "l3f0g1h12j90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    tables = insp.get_table_names()

    if "incidents" not in tables:
        op.create_table(
            "incidents",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=False, index=True),
            sa.Column("employee_id", sa.Integer, sa.ForeignKey("employees.id"), nullable=False, index=True),
            sa.Column("asset_id", sa.Integer, sa.ForeignKey("assets.id"), nullable=False, index=True),
            sa.Column("incident_type", sa.String(20), nullable=False),
            sa.Column("description", sa.Text, nullable=False),
            sa.Column("location", sa.String(500), nullable=True),
            sa.Column("has_third_party", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("third_party_name", sa.String(255), nullable=True),
            sa.Column("third_party_plate", sa.String(50), nullable=True),
            sa.Column("third_party_insurance", sa.String(255), nullable=True),
            sa.Column("third_party_phone", sa.String(50), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
            sa.Column("resolved_by", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("resolution_notes", sa.Text, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if "incident_photos" not in tables:
        op.create_table(
            "incident_photos",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("incident_id", sa.Integer, sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("file_path", sa.String(500), nullable=False),
            sa.Column("category", sa.String(30), nullable=False, server_default="DAMAGE"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table("incident_photos")
    op.drop_table("incidents")
