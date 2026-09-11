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
    InvoiceCreate,
    PaymentStatusResponse,
    Receipt,
)

router = APIRouter(prefix="/payments", tags=["payments"])

FEE_LABELS = {
    "registrasi": ("Biaya Formulir & Pendaftaran PPDB", "Dibayar sekali saat mengisi formulir PPDB.", True, "admission"),
    "booking": ("Biaya Booking Kursi / Uang Pangkal Awal", "Mengunci kursi siswa baru setelah lolos berkas.", True, "admission"),
    "spp": ("SPP Bulanan / Iuran Pembelajaran", "Iuran pembelajaran bulanan siswa aktif.", True, "sekolah"),
    "seragam": ("Seragam & Buku Paket Digital", "Paket seragam lengkap dan akses buku digital.", False, "sekolah"),
}
DEFAULT_LEVEL = "smp"


async def _level_doc(code: str) -> dict:
    row = await db.levels.find_one({"code": code or DEFAULT_LEVEL})
    if not row:
        raise HTTPException(status_code=404, detail=f"Jenjang '{code}' belum dikonfigurasi")
    return row


async def _fee_amount(level_code: str, fee_code: str) -> tuple[float, dict]:
    level = await _level_doc(level_code)
    fees = level.get("fees", {})
    if fee_code not in fees:
        raise HTTPException(status_code=404, detail=f"Tarif '{fee_code}' belum diatur untuk jenjang ini")
    return float(fees[fee_code]), level


def _stripe(request: Request) -> StripeCheckout:
    host_url = str(request.base_url)
    return StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
        webhook_url=f"{host_url}api/webhook/stripe",
    )


@router.get("/fees", response_model=List[Fee])
async def list_fees(level: Optional[str] = None):
    """Daftar tarif biaya. Tanpa parameter level, kembalikan tarif seluruh jenjang."""
    codes = [level] if level else None
    rows = await db.levels.find({"code": {"$in": codes}} if codes else {}).to_list(50)
    order = {"sd": 0, "smp": 1, "sma": 2, "smk": 3}
    rows.sort(key=lambda r: order.get(r["code"], 99))
    out: List[Fee] = []
    for lv in rows:
        for code, (name, desc, mandatory, _kat) in FEE_LABELS.items():
            if code in lv.get("fees", {}):
                out.append(Fee(
                    code=code, name=name, amount=float(lv["fees"][code]), description=desc,
                    mandatory=mandatory, level=lv["code"], level_name=lv["name"],
                ))
    return out


@router.get("/invoices", response_model=List[Invoice])
async def list_invoices(
    payer_ref: Optional[str] = None,
    status: Optional[str] = None,
    kategori: Optional[str] = None,
    level: Optional[str] = None,
):
    query = {}
    if payer_ref:
        query["payer_ref"] = payer_ref
    if status and status != "semua":
        query["status"] = status
    if kategori and kategori != "semua":
        query["kategori"] = kategori
    if level and level != "semua":
        query["level"] = level
    rows = await db.invoices.find(query).sort("created_at", -1).to_list(500)
    return [Invoice(**r) for r in rows]


@router.post("/invoices", response_model=Invoice)
async def create_invoice(payload: InvoiceCreate):
    if payload.fee_code not in FEE_LABELS:
        raise HTTPException(status_code=404, detail="Jenis biaya tidak ditemukan")
    amount, level = await _fee_amount(payload.level, payload.fee_code)
    name, _desc, _mandatory, kategori = FEE_LABELS[payload.fee_code]
    inv = Invoice(
        nomor=f"INV-{random.randint(100000, 999999)}",
        fee_code=payload.fee_code,
        fee_name=name,
        amount=amount,
        payer_name=payload.payer_name,
        payer_ref=payload.payer_ref,
        level=level["code"],
        jurusan=payload.jurusan,
        kategori=payload.kategori or kategori,
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
            await db.invoices.update_one(
                {"id": tx["invoice_id"], "status": {"$ne": "lunas"}},
                {"$set": {
                    "status": "lunas",
                    "paid_at": datetime.now(timezone.utc),
                    "receipt_no": f"KW-{random.randint(100000, 999999)}",
                }},
            )


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
        except Exception:
            pass
    return PaymentStatusResponse(
        session_id=record["session_id"],
        status=record["status"],
        payment_status=record["payment_status"],
        invoice_id=record.get("invoice_id"),
    )


@router.get("/invoices/{invoice_id}/receipt", response_model=Receipt)
async def receipt(invoice_id: str):
    inv = await db.invoices.find_one({"id": invoice_id})
    if not inv:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    if inv["status"] != "lunas":
        raise HTTPException(status_code=400, detail="Kwitansi hanya tersedia untuk tagihan yang sudah lunas")
    level = await db.levels.find_one({"code": inv.get("level") or DEFAULT_LEVEL})
    paid_at = inv.get("paid_at")
    if paid_at and paid_at.tzinfo is None:
        paid_at = paid_at.replace(tzinfo=timezone.utc)
    return Receipt(
        receipt_no=inv.get("receipt_no") or f"KW-{inv['nomor'][-6:]}",
        invoice_no=inv["nomor"],
        fee_name=inv["fee_name"],
        amount=float(inv["amount"]),
        payer_name=inv["payer_name"],
        level_name=(level or {}).get("name", ""),
        paid_at=paid_at,
    )
