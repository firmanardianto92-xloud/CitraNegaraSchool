"""Konfigurasi jenjang, tarif biaya, dan izin publikasi guru (khusus admin)."""

from typing import List

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import Level, LevelUpdate, PublishPermission, User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/levels", response_model=List[Level])
async def list_levels():
    order = {"sd": 0, "smp": 1, "sma": 2, "smk": 3}
    rows = await db.levels.find().to_list(50)
    rows.sort(key=lambda r: order.get(r["code"], 99))
    return [Level(**r) for r in rows]


@router.get("/levels/{code}", response_model=Level)
async def get_level(code: str):
    row = await db.levels.find_one({"code": code})
    if not row:
        raise HTTPException(status_code=404, detail="Jenjang tidak ditemukan")
    return Level(**row)


@router.put("/levels/{code}", response_model=Level)
async def update_level(code: str, payload: LevelUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    row = await db.levels.find_one_and_update({"code": code}, {"$set": updates}, return_document=True)
    if not row:
        raise HTTPException(status_code=404, detail="Jenjang tidak ditemukan")
    return Level(**row)


@router.get("/teachers", response_model=List[User])
async def list_teachers():
    rows = await db.users.find({"role": "guru"}).sort("name", 1).to_list(200)
    return [User(**r) for r in rows]


@router.patch("/teachers/{user_id}/publish-permission", response_model=User)
async def set_publish_permission(user_id: str, payload: PublishPermission):
    row = await db.users.find_one_and_update(
        {"id": user_id, "role": "guru"},
        {"$set": {"can_publish": payload.can_publish}},
        return_document=True,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Guru tidak ditemukan")
    return User(**row)
