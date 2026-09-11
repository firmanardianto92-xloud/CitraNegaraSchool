"""Rapor nilai: guru input nilai per mata pelajaran, sistem hitung nilai akhir & rata-rata."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import Grade, GradeCreate, GradeUpdate, RaporSummary

router = APIRouter(prefix="/grades", tags=["grades"])


def _predikat(nilai: float) -> str:
    if nilai >= 90:
        return "A"
    if nilai >= 80:
        return "B"
    if nilai >= 70:
        return "C"
    if nilai >= 60:
        return "D"
    return "E"


def _hitung(nilai_tugas: float, nilai_ujian: float) -> tuple[float, str]:
    akhir = round(nilai_tugas * 0.4 + nilai_ujian * 0.6, 1)
    return akhir, _predikat(akhir)


@router.get("", response_model=List[Grade])
async def list_grades(student_id: Optional[str] = None, semester: Optional[str] = None):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if semester:
        query["semester"] = semester
    rows = await db.grades.find(query).sort("created_at", 1).to_list(500)
    return [Grade(**r) for r in rows]


@router.get("/rapor/{student_id}", response_model=RaporSummary)
async def rapor(student_id: str):
    rows = await db.grades.find({"student_id": student_id}).sort("created_at", 1).to_list(200)
    if not rows:
        siswa = await db.users.find_one({"id": student_id})
        return RaporSummary(
            student_id=student_id,
            student_name=siswa["name"] if siswa else "Siswa",
            semester="Semester 1 - 2025/2026",
            rata_rata=0,
            predikat="-",
            jumlah_mapel=0,
            grades=[],
        )
    grades = [Grade(**r) for r in rows]
    rata = round(sum(g.nilai_akhir for g in grades) / len(grades), 1)
    return RaporSummary(
        student_id=student_id,
        student_name=grades[0].student_name,
        semester=grades[0].semester,
        rata_rata=rata,
        predikat=_predikat(rata),
        jumlah_mapel=len(grades),
        grades=grades,
    )


@router.post("", response_model=Grade)
async def create_grade(payload: GradeCreate):
    data = payload.model_dump()
    akhir, predikat = _hitung(data["nilai_tugas"], data["nilai_ujian"])
    grade = Grade(**data, nilai_akhir=akhir, predikat=predikat)
    await db.grades.insert_one(grade.model_dump())
    return grade


@router.patch("/{grade_id}", response_model=Grade)
async def update_grade(grade_id: str, payload: GradeUpdate):
    row = await db.grades.find_one({"id": grade_id})
    if not row:
        raise HTTPException(status_code=404, detail="Nilai tidak ditemukan")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan")
    merged = {**row, **updates}
    akhir, predikat = _hitung(merged["nilai_tugas"], merged["nilai_ujian"])
    updates.update({"nilai_akhir": akhir, "predikat": predikat})
    row = await db.grades.find_one_and_update({"id": grade_id}, {"$set": updates}, return_document=True)
    return Grade(**row)
