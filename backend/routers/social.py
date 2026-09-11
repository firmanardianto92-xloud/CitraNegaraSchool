"""Pengajuan publikasi hasil pengajaran ke sosial media — guru ajukan, admin review."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import SocialPost, SocialPostCreate, SocialPostReview

router = APIRouter(prefix="/social", tags=["social"])

VALID_STATUS = {"disetujui", "ditolak", "terpublikasi"}


@router.get("/posts", response_model=List[SocialPost])
async def list_posts(status: Optional[str] = None, diajukan_oleh_id: Optional[str] = None):
    query = {}
    if status and status != "semua":
        query["status"] = status
    if diajukan_oleh_id:
        query["diajukan_oleh_id"] = diajukan_oleh_id
    rows = await db.social_posts.find(query).sort("created_at", -1).to_list(300)
    return [SocialPost(**r) for r in rows]


@router.post("/posts", response_model=SocialPost)
async def create_post(payload: SocialPostCreate):
    if payload.diajukan_oleh_id:
        guru = await db.users.find_one({"id": payload.diajukan_oleh_id})
        if guru and guru.get("role") == "guru" and not guru.get("can_publish", False):
            raise HTTPException(
                status_code=403,
                detail="Guru ini belum diberi izin publikasi oleh admin",
            )
    post = SocialPost(**payload.model_dump())
    await db.social_posts.insert_one(post.model_dump())
    return post


@router.patch("/posts/{post_id}", response_model=SocialPost)
async def review_post(post_id: str, payload: SocialPostReview):
    if payload.status not in VALID_STATUS:
        raise HTTPException(status_code=400, detail="Status review tidak valid")
    row = await db.social_posts.find_one_and_update(
        {"id": post_id},
        {"$set": {
            "status": payload.status,
            "catatan_review": payload.catatan_review,
            "direview_oleh": payload.direview_oleh,
        }},
        return_document=True,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    return SocialPost(**row)
