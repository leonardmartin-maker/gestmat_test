from alembic import op

revision = "91bcae3e11be"
down_revision = "dee16b1dc41d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # EVENTS: dernier event par asset (scan rules, with-assignee, history)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_events_company_asset_occurred_id_desc
        ON events (company_id, asset_id, occurred_at DESC, id DESC);
        """
    )

    # EVENTS: dernier event par employee (audit / future screens)
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_events_company_employee_occurred_id_desc
        ON events (company_id, employee_id, occurred_at DESC, id DESC);
        """
    )

    # EVENTS: dashboard "last 7 days"
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_events_company_occurred_at
        ON events (company_id, occurred_at);
        """
    )

    # ASSETS: filtres fréquents
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_assets_company_status
        ON assets (company_id, status);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_assets_company_category
        ON assets (company_id, category);
        """
    )

    # EMPLOYEES: filtres + lookup
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_employees_company_active
        ON employees (company_id, active);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_employees_company_employee_code
        ON employees (company_id, employee_code);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_employees_company_employee_code;")
    op.execute("DROP INDEX IF EXISTS ix_employees_company_active;")
    op.execute("DROP INDEX IF EXISTS ix_assets_company_category;")
    op.execute("DROP INDEX IF EXISTS ix_assets_company_status;")
    op.execute("DROP INDEX IF EXISTS ix_events_company_occurred_at;")
    op.execute("DROP INDEX IF EXISTS ix_events_company_employee_occurred_id_desc;")
    op.execute("DROP INDEX IF EXISTS ix_events_company_asset_occurred_id_desc;")