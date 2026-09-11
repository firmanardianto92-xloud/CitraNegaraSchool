"""Catatan perkembangan dari wali kelas — ditulis guru, dibaca siswa & orang tua."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import CatatanWali, CatatanWaliCreate

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=List[CatatanWali])
async def list_notes(student_id: Optional[str] = None, guru_id: Optional[str] = None):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if guru_id:
        query["guru_id"] = guru_id
    rows = await db.catatan_wali.find(query).sort("created_at", -1).to_list(300)
    return [CatatanWali(**r) for r in rows]


@router.post("", response_model=CatatanWali)
async def create_note(payload: CatatanWaliCreate):
    isi = payload.isi.strip()
    if not isi:
        raise HTTPException(status_code=400, detail="Catatan tidak boleh kosong")
    siswa = await db.users.find_one({"id": payload.student_id, "role": "siswa"})
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    note = CatatanWali(
        **{**payload.model_dump(), "isi": isi},
        student_name=siswa["name"],
    )
    await db.catatan_wali.insert_one(note.model_dump())
    return note


@router.delete("/{note_id}")
async def delete_note(note_id: str):
    res = await db.catatan_wali.delete_one({"id": note_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catatan tidak ditemukan")
    return {"ok": True}
