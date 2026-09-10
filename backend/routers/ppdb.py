import random
from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import Invoice, PpdbCreate, PpdbRegistration, PpdbStatusUpdate
from routers.payments import FEES

router = APIRouter(prefix="/ppdb", tags=["ppdb"])

AUTO_INVOICE_FEES = ["registrasi", "booking"]


@router.get("/registrations", response_model=List[PpdbRegistration])
async def list_registrations(status: Optional[str] = None):
    query = {"status": status} if status and status != "semua" else {}
    rows = await db.ppdb.find(query).sort("created_at", -1).to_list(500)
    return [PpdbRegistration(**r) for r in rows]


@router.post("/registrations", response_model=PpdbRegistration)
async def create_registration(payload: PpdbCreate):
    nomor = f"PPDB-2026-{random.randint(1000, 9999)}"
    reg = PpdbRegistration(nomor_pendaftaran=nomor, **payload.model_dump())
    await db.ppdb.insert_one(reg.model_dump())

    for code in AUTO_INVOICE_FEES:
        fee = next(f for f in FEES if f.code == code)
        inv = Invoice(
            nomor=f"INV-{random.randint(100000, 999999)}",
            fee_code=fee.code,
            fee_name=fee.name,
            amount=fee.amount,
            payer_name=reg.nama_lengkap,
            payer_ref=reg.id,
        )
        await db.invoices.insert_one(inv.model_dump())
    return reg


@router.get("/registrations/{reg_id}", response_model=PpdbRegistration)
async def get_registration(reg_id: str):
    row = await db.ppdb.find_one({"id": reg_id})
    if not row:
        raise HTTPException(status_code=404, detail="Pendaftaran tidak ditemukan")
    return PpdbRegistration(**row)


@router.patch("/registrations/{reg_id}", response_model=PpdbRegistration)
async def update_status(reg_id: str, payload: PpdbStatusUpdate):
    allowed = {"menunggu_verifikasi", "diverifikasi", "diterima", "ditolak"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Status tidak valid")
    row = await db.ppdb.find_one_and_update(
        {"id": reg_id}, {"$set": {"status": payload.status}}, return_document=True
    )
    if not row:
        raise HTTPException(status_code=404, detail="Pendaftaran tidak ditemukan")
    return PpdbRegistration(**row)
