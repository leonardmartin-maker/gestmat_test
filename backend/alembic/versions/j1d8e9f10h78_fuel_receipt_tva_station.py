"""Add tva_amount, tva_number, station_address to fuel_receipts.

Revision ID: j1d8e9f10h78
Revises: i0c7d8e09g67
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j1d8e9f10h78"
down_revision: Union[str, None] = "i0c7d8e09g67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("fuel_receipts", sa.Column("tva_amount", sa.Numeric(10, 2), nullable=True))
    op.add_column("fuel_receipts", sa.Column("tva_number", sa.String(50), nullable=True))
    op.add_column("fuel_receipts", sa.Column("station_address", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("fuel_receipts", "station_address")
    op.drop_column("fuel_receipts", "tva_number")
    op.drop_column("fuel_receipts", "tva_amount")
