"""Add gps_devices table for Teltonika tracker integration.

Revision ID: n5h2i3j14l12
Revises: m4g1h2i13k01
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


revision: str = "n5h2i3j14l12"
down_revision: Union[str, None] = "m4g1h2i13k01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    tables = insp.get_table_names()

    if "gps_devices" not in tables:
        op.create_table(
            "gps_devices",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=False, index=True),
            sa.Column("asset_id", sa.Integer, sa.ForeignKey("assets.id"), nullable=False, index=True),
            sa.Column("imei", sa.String(20), nullable=False, index=True),
            sa.Column("device_model", sa.String(50), nullable=True),
            sa.Column("label", sa.String(100), nullable=True),
            sa.Column("relay_state", sa.String(10), nullable=False, server_default="UNKNOWN"),
            sa.Column("is_online", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("last_connected_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_lat", sa.Float, nullable=True),
            sa.Column("last_lng", sa.Float, nullable=True),
            sa.Column("last_speed", sa.Integer, nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_unique_constraint("uq_gps_devices_imei", "gps_devices", ["imei"])
        op.create_unique_constraint("uq_gps_devices_asset_id", "gps_devices", ["asset_id"])


def downgrade() -> None:
    op.drop_table("gps_devices")
