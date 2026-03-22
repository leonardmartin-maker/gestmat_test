"""Add purchase_invoice_path to assets and document_path to maintenance_logs.

Revision ID: i0c7d8e09g67
Revises: h9b6c7d08f56
Create Date: 2026-03-22
"""
import sqlalchemy as sa
from alembic import op

revision = "i0c7d8e09g67"
down_revision = "h9b6c7d08f56"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("assets", sa.Column("purchase_invoice_path", sa.String(500), nullable=True))
    op.add_column("maintenance_logs", sa.Column("document_path", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("maintenance_logs", "document_path")
    op.drop_column("assets", "purchase_invoice_path")
