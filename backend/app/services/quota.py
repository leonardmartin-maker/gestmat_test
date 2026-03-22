"""Quota enforcement for SaaS plans."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.employee import Employee
from app.models.subscription import Plan, Subscription


def _get_subscription(db: Session, company_id: int) -> tuple[Subscription, Plan]:
    """Return (subscription, plan) or raise 403."""
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(403, "Aucun abonnement actif. Veuillez souscrire un plan.")

    plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
    if not plan:
        raise HTTPException(500, "Plan introuvable")

    return sub, plan


def check_subscription_active(db: Session, company_id: int) -> tuple[Subscription, Plan]:
    """Verify subscription is active or trial not expired."""
    sub, plan = _get_subscription(db, company_id)

    if sub.status == "TRIAL":
        if sub.trial_ends_at and sub.trial_ends_at < datetime.now(timezone.utc):
            sub.status = "EXPIRED"
            db.commit()
            raise HTTPException(403, "Votre periode d'essai est terminee. Veuillez choisir un plan.")
        return sub, plan

    if sub.status in ("ACTIVE",):
        return sub, plan

    if sub.status == "PAST_DUE":
        raise HTTPException(403, "Paiement en retard. Veuillez mettre a jour votre moyen de paiement.")

    if sub.status in ("CANCELLED", "EXPIRED"):
        raise HTTPException(403, "Votre abonnement est expire. Veuillez renouveler.")

    return sub, plan


def get_limits(db: Session, company_id: int) -> dict:
    """Return current limits for a company."""
    sub, plan = _get_subscription(db, company_id)

    max_employees = plan.max_employees
    if plan.max_employees > 0:  # 0 = unlimited
        max_employees = plan.max_employees + sub.extra_employees

    return {
        "plan_code": plan.code,
        "plan_name": plan.name,
        "status": sub.status,
        "max_employees": max_employees if plan.max_employees > 0 else -1,
        "max_vehicles": plan.max_vehicles if plan.max_vehicles > 0 else -1,
        "max_assets": plan.max_assets if plan.max_assets > 0 else -1,
        "extra_employees": sub.extra_employees,
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
    }


def check_employee_quota(db: Session, company_id: int) -> None:
    """Raise 403 if employee limit reached."""
    sub, plan = check_subscription_active(db, company_id)

    if plan.max_employees <= 0:  # unlimited
        return

    max_allowed = plan.max_employees + sub.extra_employees
    current = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.is_deleted.is_(False),
    ).count()

    if current >= max_allowed:
        raise HTTPException(
            403,
            f"Limite atteinte : {max_allowed} employes max ({plan.name}). "
            f"Passez au plan superieur ou ajoutez des employes supplementaires."
        )


def check_vehicle_quota(db: Session, company_id: int) -> None:
    """Raise 403 if vehicle limit reached."""
    sub, plan = check_subscription_active(db, company_id)

    if plan.max_vehicles <= 0:
        return

    current = db.query(Asset).filter(
        Asset.company_id == company_id,
        Asset.category == "VEHICLE",
        Asset.is_deleted.is_(False),
    ).count()

    if current >= plan.max_vehicles:
        raise HTTPException(
            403,
            f"Limite atteinte : {plan.max_vehicles} vehicules max ({plan.name}). "
            f"Passez au plan superieur."
        )


def check_asset_quota(db: Session, company_id: int) -> None:
    """Raise 403 if asset (EPI) limit reached."""
    sub, plan = check_subscription_active(db, company_id)

    if plan.max_assets <= 0:
        return

    current = db.query(Asset).filter(
        Asset.company_id == company_id,
        Asset.category != "VEHICLE",
        Asset.is_deleted.is_(False),
    ).count()

    if current >= plan.max_assets:
        raise HTTPException(
            403,
            f"Limite atteinte : {plan.max_assets} equipements max ({plan.name}). "
            f"Passez au plan superieur."
        )
