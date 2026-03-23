"""Add is_active column to users table.

Revision ID: l3f0g1h12j90
Revises: k2e9f0g11i89
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa


revision: str = "l3f0g1h12j90"
down_revision: Union[str, None] = "k2e9f0g11i89"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    columns = [c["name"] for c in insp.get_columns("users")]
    if "is_active" not in columns:
        op.add_column("users", sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"))
    indexes = [ix["name"] for ix in insp.get_indexes("users")]
    if "ix_users_is_active" not in indexes:
        op.create_index("ix_users_is_active", "users", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_users_is_active", table_name="users")
    op.drop_column("users", "is_active")
