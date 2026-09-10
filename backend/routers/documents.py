from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import Document, DocumentCreate, Submission, SubmissionCreate

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=List[Document])
async def list_documents(type: Optional[str] = None, subject: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    if subject and subject != "semua":
        query["subject"] = subject
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    docs = await db.documents.find(query).sort("created_at", -1).to_list(500)
    return [Document(**d) for d in docs]


@router.post("", response_model=Document)
async def create_document(payload: DocumentCreate):
    doc = Document(**payload.model_dump())
    await db.documents.insert_one(doc.model_dump())
    return doc


@router.get("/{doc_id}", response_model=Document)
async def get_document(doc_id: str):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    return Document(**doc)


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    res = await db.documents.delete_one({"id": doc_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    return {"ok": True}


@router.get("/{doc_id}/submissions", response_model=List[Submission])
async def list_submissions(doc_id: str):
    subs = await db.submissions.find({"document_id": doc_id}).sort("submitted_at", -1).to_list(200)
    return [Submission(**s) for s in subs]


@router.post("/{doc_id}/submissions", response_model=Submission)
async def submit(doc_id: str, payload: SubmissionCreate):
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan")
    sub = Submission(document_id=doc_id, **payload.model_dump())
    await db.submissions.insert_one(sub.model_dump())
    return sub
