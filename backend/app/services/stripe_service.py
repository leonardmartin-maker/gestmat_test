"""Stripe billing service."""

import stripe
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.company import Company
from app.models.employee import Employee
from app.models.subscription import Plan, Subscription

stripe.api_key = settings.STRIPE_SECRET_KEY


def _get_or_create_customer(db: Session, company: Company, sub: Subscription) -> str:
    """Get existing Stripe customer or create a new one."""
    if sub.stripe_customer_id:
        return sub.stripe_customer_id

    customer = stripe.Customer.create(
        name=company.name,
        email=company.contact_email,
        metadata={"company_id": str(company.id), "company_slug": company.slug or ""},
    )
    sub.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def get_employee_count(db: Session, company_id: int) -> int:
    """Get current active employee count for a company."""
    return db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.is_deleted.is_(False),
    ).count()


def create_checkout_session(
    db: Session,
    company_id: int,
    plan_code: str,
    with_fuel: bool = False,
    success_url: str | None = None,
    cancel_url: str | None = None,
) -> str:
    """Create a Stripe Checkout session and return the URL."""
    company = db.query(Company).filter(Company.id == company_id).first()
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    plan = db.query(Plan).filter(Plan.code == plan_code, Plan.is_active.is_(True)).first()

    if not company or not sub or not plan:
        raise ValueError("Company, subscription or plan not found")

    if not plan.stripe_price_id:
        raise ValueError(f"Plan {plan_code} has no Stripe price ID configured")

    customer_id = _get_or_create_customer(db, company, sub)

    # Count employees for quantity (minimum 1)
    employee_count = max(get_employee_count(db, company_id), 1)

    line_items = [
        {
            "price": plan.stripe_price_id,
            "quantity": employee_count,
        }
    ]

    # Add fuel module if requested
    if with_fuel:
        fuel_plan = db.query(Plan).filter(Plan.code == "FUEL_OPTION").first()
        if fuel_plan and fuel_plan.stripe_price_id:
            line_items.append({
                "price": fuel_plan.stripe_price_id,
                "quantity": employee_count,
            })

    base_url = settings.FRONTEND_BASE_URL
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=line_items,
        success_url=success_url or f"{base_url}/settings?checkout=success",
        cancel_url=cancel_url or f"{base_url}/settings?checkout=cancel",
        metadata={
            "company_id": str(company_id),
            "plan_code": plan_code,
            "with_fuel": "1" if with_fuel else "0",
        },
        subscription_data={
            "metadata": {
                "company_id": str(company_id),
                "plan_code": plan_code,
            },
        },
    )
    return session.url


def create_customer_portal_session(db: Session, company_id: int) -> str:
    """Create a Stripe Customer Portal session for billing management."""
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub or not sub.stripe_customer_id:
        raise ValueError("No Stripe customer found. Please subscribe first.")

    base_url = settings.FRONTEND_BASE_URL
    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{base_url}/settings",
    )
    return session.url


def handle_checkout_completed(db: Session, session: dict) -> None:
    """Handle checkout.session.completed webhook event."""
    company_id = int(session["metadata"]["company_id"])
    plan_code = session["metadata"]["plan_code"]
    stripe_subscription_id = session.get("subscription")

    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    plan = db.query(Plan).filter(Plan.code == plan_code).first()

    if not sub or not plan:
        return

    sub.plan_id = plan.id
    sub.status = "ACTIVE"
    sub.trial_ends_at = None
    sub.stripe_subscription_id = stripe_subscription_id

    if not sub.stripe_customer_id and session.get("customer"):
        sub.stripe_customer_id = session["customer"]

    db.commit()


def handle_subscription_updated(db: Session, stripe_sub: dict) -> None:
    """Handle customer.subscription.updated webhook event."""
    company_id_str = stripe_sub.get("metadata", {}).get("company_id")
    if not company_id_str:
        return

    company_id = int(company_id_str)
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        return

    status_map = {
        "active": "ACTIVE",
        "past_due": "PAST_DUE",
        "canceled": "CANCELLED",
        "unpaid": "PAST_DUE",
        "incomplete": "PAST_DUE",
        "incomplete_expired": "EXPIRED",
        "trialing": "TRIAL",
    }

    stripe_status = stripe_sub.get("status", "")
    new_status = status_map.get(stripe_status)
    if new_status:
        sub.status = new_status

    # Update period dates
    period_start = stripe_sub.get("current_period_start")
    period_end = stripe_sub.get("current_period_end")
    if period_start:
        from datetime import datetime, timezone
        sub.current_period_start = datetime.fromtimestamp(period_start, tz=timezone.utc)
    if period_end:
        from datetime import datetime, timezone
        sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

    db.commit()


def handle_subscription_deleted(db: Session, stripe_sub: dict) -> None:
    """Handle customer.subscription.deleted webhook event."""
    company_id_str = stripe_sub.get("metadata", {}).get("company_id")
    if not company_id_str:
        return

    company_id = int(company_id_str)
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        return

    sub.status = "CANCELLED"
    sub.stripe_subscription_id = None
    db.commit()


def handle_invoice_paid(db: Session, invoice: dict) -> None:
    """Handle invoice.paid — subscription is active and paid."""
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return

    sub = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_sub_id
    ).first()
    if not sub:
        return

    if sub.status != "ACTIVE":
        sub.status = "ACTIVE"
        db.commit()


def handle_invoice_payment_failed(db: Session, invoice: dict) -> None:
    """Handle invoice.payment_failed — mark as past due."""
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return

    sub = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_sub_id
    ).first()
    if not sub:
        return

    sub.status = "PAST_DUE"
    db.commit()
