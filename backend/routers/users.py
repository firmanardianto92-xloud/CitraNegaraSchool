from typing import List, Optional

from fastapi import APIRouter

from lib.db import db
from models.schemas import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[User])
async def list_users(
    role: Optional[str] = None,
    level: Optional[str] = None,
    jurusan: Optional[str] = None,
    homeroom_teacher_id: Optional[str] = None,
):
    query = {}
    if role:
        query["role"] = role
    if level and level != "semua":
        query["level"] = level
    if jurusan and jurusan != "semua":
        query["jurusan"] = jurusan
    if homeroom_teacher_id:
        query["homeroom_teacher_id"] = homeroom_teacher_id
    rows = await db.users.find(query).sort("name", 1).to_list(500)
    return [User(**r) for r in rows]
