import random
from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import Mentor, MentoringCreate, MentoringSession, MentoringUpdate

router = APIRouter(prefix="/mentoring", tags=["mentoring"])


@router.get("/mentors", response_model=List[Mentor])
async def list_mentors():
    rows = await db.mentors.find().to_list(100)
    return [Mentor(**r) for r in rows]


@router.get("/sessions", response_model=List[MentoringSession])
async def list_sessions(student_id: Optional[str] = None, mentor_id: Optional[str] = None):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if mentor_id:
        query["mentor_id"] = mentor_id
    rows = await db.mentoring_sessions.find(query).sort("created_at", -1).to_list(300)
    return [MentoringSession(**r) for r in rows]


@router.post("/sessions", response_model=MentoringSession)
async def create_session(payload: MentoringCreate):
    mentor = await db.mentors.find_one({"id": payload.mentor_id})
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor tidak ditemukan")
    session = MentoringSession(
        mentor_name=mentor["name"],
        meeting_link=f"https://meet.citranegara.sch.id/{random.randint(100000, 999999)}",
        **payload.model_dump(),
    )
    await db.mentoring_sessions.insert_one(session.model_dump())
    return session


@router.patch("/sessions/{session_id}", response_model=MentoringSession)
async def update_session(session_id: str, payload: MentoringUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    row = await db.mentoring_sessions.find_one_and_update(
        {"id": session_id}, {"$set": updates}, return_document=True
    )
    if not row:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    return MentoringSession(**row)
