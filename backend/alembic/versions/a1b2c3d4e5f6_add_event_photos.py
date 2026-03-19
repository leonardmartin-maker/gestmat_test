"""add event_photos table and damage_description to events

Revision ID: a1b2c3d4e5f6
Revises: f7a4b5c06d34
Create Date: 2026-03-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f7a4b5c06d34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add damage_description to events
    op.add_column("events", sa.Column("damage_description", sa.Text(), nullable=True))

    # Create event_photos table
    op.create_table(
        "event_photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("category", sa.String(20), nullable=False),  # STATE / DAMAGE
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("event_photos")
    op.drop_column("events", "damage_description")
