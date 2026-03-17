from alembic import op
import sqlalchemy as sa

revision = "b189e9895c65"
down_revision = "91bcae3e11be"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # employees
    op.add_column("employees", sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("employees", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_employees_company_is_deleted", "employees", ["company_id", "is_deleted"])

    # assets
    op.add_column("assets", sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("assets", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_assets_company_is_deleted", "assets", ["company_id", "is_deleted"])


def downgrade() -> None:
    op.drop_index("ix_assets_company_is_deleted", table_name="assets")
    op.drop_column("assets", "deleted_at")
    op.drop_column("assets", "is_deleted")

    op.drop_index("ix_employees_company_is_deleted", table_name="employees")
    op.drop_column("employees", "deleted_at")
    op.drop_column("employees", "is_deleted")