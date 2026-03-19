"""add epi_categories table and asset epi fields

Revision ID: e6c3d4a05b23
Revises: d5b2f3a94c12
Create Date: 2026-03-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e6c3d4a05b23"
down_revision: Union[str, None] = "d5b2f3a94c12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create epi_categories table
    op.create_table(
        "epi_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("enabled_attributes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false", index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Add epi_category_id and epi_attributes to assets
    op.add_column("assets", sa.Column("epi_category_id", sa.Integer(), sa.ForeignKey("epi_categories.id"), nullable=True, index=True))
    op.add_column("assets", sa.Column("epi_attributes", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("assets", "epi_attributes")
    op.drop_column("assets", "epi_category_id")
    op.drop_table("epi_categories")
