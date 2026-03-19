"""add audit_logs table

Revision ID: d5b2f3a94c12
Revises: c4a1e2f83b01
Create Date: 2026-03-18 03:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5b2f3a94c12"
down_revision: Union[str, None] = "c4a1e2f83b01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, index=True),
        sa.Column("entity_type", sa.String(50), nullable=True, index=True),
        sa.Column("entity_id", sa.Integer(), nullable=True, index=True),
        sa.Column("action", sa.String(50), nullable=False, index=True),
        sa.Column("before", sa.JSON(), nullable=True),
        sa.Column("after", sa.JSON(), nullable=True),
        sa.Column("request_id", sa.String(64), nullable=True, index=True),
        sa.Column("ip", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
