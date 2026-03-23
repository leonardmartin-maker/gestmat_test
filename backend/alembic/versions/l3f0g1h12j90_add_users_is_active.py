"""Add is_active column to users table.

Revision ID: l3f0g1h12j90
Revises: k2e9f0g11i89
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "l3f0g1h12j90"
down_revision: Union[str, None] = "k2e9f0g11i89"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"))
    op.create_index("ix_users_is_active", "users", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_users_is_active", table_name="users")
    op.drop_column("users", "is_active")
