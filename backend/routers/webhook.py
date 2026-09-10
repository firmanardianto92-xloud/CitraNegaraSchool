"""Stripe webhook — must be mounted at exactly /api/webhook/stripe."""

import os

from emergentintegrations.payments.stripe.checkout import StripeCheckout
from fastapi import APIRouter, HTTPException, Request

from routers.payments import _mark_paid

router = APIRouter(tags=["webhook"])


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
        webhook_url=f"{str(request.base_url)}api/webhook/stripe",
    )
    try:
        event = await checkout.handle_webhook(body, request.headers.get("Stripe-Signature"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook tidak valid: {exc}") from exc
    if event.session_id and event.payment_status == "paid":
        await _mark_paid(event.session_id, "paid")
    return {"status": "ok"}
