"""add email to employees

Revision ID: c4a1e2f83b01
Revises: b189e9895c65
Create Date: 2026-03-18 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4a1e2f83b01"
down_revision: Union[str, None] = "b189e9895c65"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("email", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "email")
