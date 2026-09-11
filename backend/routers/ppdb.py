import random
from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import Invoice, PpdbCreate, PpdbRegistration, PpdbStatusUpdate
from routers.payments import FEE_LABELS

router = APIRouter(prefix="/ppdb", tags=["ppdb"])

AUTO_INVOICE_FEES = ["registrasi", "booking"]


@router.get("/registrations", response_model=List[PpdbRegistration])
async def list_registrations(status: Optional[str] = None, level: Optional[str] = None):
    query = {}
    if status and status != "semua":
        query["status"] = status
    if level and level != "semua":
        query["level"] = level
    rows = await db.ppdb.find(query).sort("created_at", -1).to_list(500)
    return [PpdbRegistration(**r) for r in rows]


@router.post("/registrations", response_model=PpdbRegistration)
async def create_registration(payload: PpdbCreate):
    level = await db.levels.find_one({"code": payload.level})
    if not level:
        raise HTTPException(status_code=404, detail="Jenjang tidak ditemukan")

    nomor = f"PPDB-2026-{random.randint(1000, 9999)}"
    reg = PpdbRegistration(nomor_pendaftaran=nomor, **payload.model_dump())
    await db.ppdb.insert_one(reg.model_dump())

    # Tagihan admission otomatis mengikuti tarif jenjang yang dipilih.
    for code in AUTO_INVOICE_FEES:
        amount = level.get("fees", {}).get(code)
        if amount is None:
            continue
        name, _desc, _mandatory, kategori = FEE_LABELS[code]
        inv = Invoice(
            nomor=f"INV-{random.randint(100000, 999999)}",
            fee_code=code,
            fee_name=name,
            amount=float(amount),
            payer_name=reg.nama_lengkap,
            payer_ref=reg.id,
            level=level["code"],
            jurusan=reg.program,
            kategori=kategori,
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
