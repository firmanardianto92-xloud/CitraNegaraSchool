import os
import random
from datetime import datetime, timezone
from typing import List, Optional

from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    StripeCheckout,
)
from fastapi import APIRouter, HTTPException, Request

from lib.db import db
from models.schemas import (
    CheckoutRequest,
    CheckoutResponse,
    Fee,
    Invoice,
    PaymentStatusResponse,
)

router = APIRouter(prefix="/payments", tags=["payments"])

# Server-side catalog — amounts are never accepted from the frontend.
FEES: List[Fee] = [
    Fee(code="registrasi", name="Biaya Formulir & Pendaftaran PPDB", amount=250000.0,
        description="Dibayar sekali saat mengisi formulir PPDB 2026."),
    Fee(code="booking", name="Biaya Booking Kursi / Uang Pangkal Awal", amount=1500000.0,
        description="Mengunci kursi siswa baru setelah dinyatakan lolos berkas."),
    Fee(code="spp", name="SPP Bulanan / Iuran Pembelajaran", amount=650000.0,
        description="Iuran pembelajaran bulanan siswa aktif."),
    Fee(code="seragam", name="Seragam & Buku Paket Digital", amount=1200000.0,
        description="Paket seragam lengkap dan akses buku digital.", mandatory=False),
]


def _stripe(request: Request) -> StripeCheckout:
    host_url = str(request.base_url)
    return StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
        webhook_url=f"{host_url}api/webhook/stripe",
    )


@router.get("/fees", response_model=List[Fee])
async def list_fees():
    return FEES


@router.get("/invoices", response_model=List[Invoice])
async def list_invoices(payer_ref: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if payer_ref:
        query["payer_ref"] = payer_ref
    if status and status != "semua":
        query["status"] = status
    rows = await db.invoices.find(query).sort("created_at", -1).to_list(500)
    return [Invoice(**r) for r in rows]


class _InvoiceCreate(CheckoutRequest):
    pass


@router.post("/invoices", response_model=Invoice)
async def create_invoice(fee_code: str, payer_name: str, payer_ref: str = ""):
    fee = next((f for f in FEES if f.code == fee_code), None)
    if not fee:
        raise HTTPException(status_code=404, detail="Jenis biaya tidak ditemukan")
    inv = Invoice(
        nomor=f"INV-{random.randint(100000, 999999)}",
        fee_code=fee.code,
        fee_name=fee.name,
        amount=fee.amount,
        payer_name=payer_name,
        payer_ref=payer_ref,
    )
    await db.invoices.insert_one(inv.model_dump())
    return inv


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(payload: CheckoutRequest, request: Request):
    inv = await db.invoices.find_one({"id": payload.invoice_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    if inv["status"] == "lunas":
        raise HTTPException(status_code=400, detail="Tagihan sudah lunas")

    origin = payload.origin_url.rstrip("/")
    checkout = _stripe(request)
    session = await checkout.create_checkout_session(
        CheckoutSessionRequest(
            amount=float(inv["amount"]),
            currency="idr",
            success_url=f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/payment/cancel",
            metadata={"invoice_id": inv["id"], "fee_code": inv["fee_code"]},
        )
    )
    now = datetime.now(timezone.utc)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "invoice_id": inv["id"],
        "amount": float(inv["amount"]),
        "currency": "idr",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now,
        "updated_at": now,
    })
    await db.invoices.update_one(
        {"id": inv["id"]}, {"$set": {"status": "menunggu", "session_id": session.session_id}}
    )
    return CheckoutResponse(checkout_url=session.url, session_id=session.session_id)


async def _mark_paid(session_id: str, payment_status: str):
    res = await db.payment_transactions.update_one(
        {"session_id": session_id, "payment_status": {"$ne": "paid"}},
        {"$set": {"status": "completed", "payment_status": payment_status,
                  "updated_at": datetime.now(timezone.utc)}},
    )
    if res.modified_count and payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": session_id})
        if tx and tx.get("invoice_id"):
            await db.invoices.update_one({"id": tx["invoice_id"]}, {"$set": {"status": "lunas"}})


@router.get("/status/{session_id}", response_model=PaymentStatusResponse)
async def get_status(session_id: str, request: Request):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    if record.get("payment_status") != "paid":
        try:
            status = await _stripe(request).get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                await _mark_paid(session_id, "paid")
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except Exception:  # transient Stripe error — report what the DB has
            pass
    return PaymentStatusResponse(
        session_id=record["session_id"],
        status=record["status"],
        payment_status=record["payment_status"],
        invoice_id=record.get("invoice_id"),
    )
