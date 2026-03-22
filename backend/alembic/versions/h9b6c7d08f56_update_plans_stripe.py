"""Update plans to new pricing model (per-employee) and add fuel option.

Revision ID: h9b6c7d08f56
Revises: g8a5b6c07e45
Create Date: 2026-03-22
"""
from alembic import op

revision = "h9b6c7d08f56"
down_revision = "g8a5b6c07e45"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Deactivate old plans (keep TRIAL and ENTERPRISE)
    op.execute("""
        UPDATE plans SET is_active = false WHERE code IN ('PRO_PME', 'PRO_PME_PLUS')
    """)

    # Add STANDARD plan: 4 CHF per employee per month, unlimited vehicles & assets
    op.execute("""
        INSERT INTO plans (code, name, price_chf, extra_employee_price_chf, max_employees, max_vehicles, max_assets, trial_days, is_active)
        VALUES ('STANDARD', 'Standard', 4, 0, 0, 0, 0, 0, true)
        ON CONFLICT (code) DO UPDATE SET
            name = 'Standard',
            price_chf = 4,
            extra_employee_price_chf = 0,
            max_employees = 0,
            max_vehicles = 0,
            max_assets = 0,
            is_active = true
    """)

    # Add FUEL_OPTION as a special plan entry for Stripe price reference
    op.execute("""
        INSERT INTO plans (code, name, price_chf, extra_employee_price_chf, max_employees, max_vehicles, max_assets, trial_days, is_active)
        VALUES ('FUEL_OPTION', 'Module carburant', 0.50, 0, 0, 0, 0, 0, true)
        ON CONFLICT (code) DO UPDATE SET
            name = 'Module carburant',
            price_chf = 0.50,
            is_active = true
    """)

    # Migrate existing PRO_PME / PRO_PME_PLUS subscriptions to STANDARD
    op.execute("""
        UPDATE subscriptions
        SET plan_id = (SELECT id FROM plans WHERE code = 'STANDARD')
        WHERE plan_id IN (SELECT id FROM plans WHERE code IN ('PRO_PME', 'PRO_PME_PLUS'))
    """)


def downgrade() -> None:
    # Reactivate old plans
    op.execute("UPDATE plans SET is_active = true WHERE code IN ('PRO_PME', 'PRO_PME_PLUS')")
    # Remove new plans
    op.execute("DELETE FROM plans WHERE code IN ('STANDARD', 'FUEL_OPTION')")
