"""Stripe webhook handler — public endpoint (no JWT auth)."""

import logging

import stripe
from fastapi import APIRouter, Header, HTTPException, Request, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db
from app.services.stripe_service import (
    handle_checkout_completed,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_invoice_paid,
    handle_invoice_payment_failed,
)

logger = logging.getLogger(__name__)

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str = Header(None, alias="stripe-signature"),
):
    """Handle incoming Stripe webhook events."""
    body = await request.body()

    # Verify signature if webhook secret is configured
    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                body,
                stripe_signature,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except stripe.SignatureVerificationError:
            logger.warning("Stripe webhook signature verification failed")
            raise HTTPException(400, "Invalid signature")
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            raise HTTPException(400, str(e))
    else:
        # In dev/test mode without webhook secret, parse directly
        import json
        event = json.loads(body)

    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})

    logger.info(f"Stripe webhook received: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            handle_checkout_completed(db, data_object)

        elif event_type == "customer.subscription.updated":
            handle_subscription_updated(db, data_object)

        elif event_type == "customer.subscription.deleted":
            handle_subscription_deleted(db, data_object)

        elif event_type == "invoice.paid":
            handle_invoice_paid(db, data_object)

        elif event_type == "invoice.payment_failed":
            handle_invoice_payment_failed(db, data_object)

        else:
            logger.debug(f"Unhandled Stripe event: {event_type}")

    except Exception as e:
        logger.error(f"Error handling Stripe event {event_type}: {e}")
        # Return 200 anyway to prevent Stripe from retrying endlessly
        # Errors are logged for investigation

    return {"received": True}
