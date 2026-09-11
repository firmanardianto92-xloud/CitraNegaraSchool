"""Rapor nilai: guru input nilai per mata pelajaran, sistem hitung nilai akhir & rata-rata."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.schemas import (
    Grade, GradeCreate, GradeUpdate, KelasStudentRow, KelasSummary, RaporSummary,
)

router = APIRouter(prefix="/grades", tags=["grades"])

KKM = 75  # nilai di bawah ini dihitung sebagai "nilai merah"


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


@router.get("/kelas/{teacher_id}", response_model=KelasSummary)
async def kelas(teacher_id: str):
    """Rekap nilai seluruh siswa yang diampu seorang guru, termasuk penanda nilai merah."""
    guru = await db.users.find_one({"id": teacher_id, "role": {"$in": ["guru", "admin"]}})
    if not guru:
        raise HTTPException(status_code=404, detail="Guru tidak ditemukan")

    siswa = await db.users.find({"role": "siswa", "homeroom_teacher_id": teacher_id}).sort("name", 1).to_list(200)
    rows: List[KelasStudentRow] = []
    for s in siswa:
        g_rows = await db.grades.find({"student_id": s["id"]}).sort("subject", 1).to_list(100)
        grades = [Grade(**g) for g in g_rows]
        merah = [g for g in grades if g.nilai_akhir < KKM]
        rata = round(sum(g.nilai_akhir for g in grades) / len(grades), 1) if grades else 0
        rows.append(KelasStudentRow(
            student_id=s["id"],
            student_name=s["name"],
            kelas=s.get("kelas") or "",
            jurusan=s.get("jurusan") or "",
            rata_rata=rata,
            predikat=_predikat(rata) if grades else "-",
            jumlah_mapel=len(grades),
            jumlah_merah=len(merah),
            tuntas=len(merah) == 0,
            grades=grades,
        ))

    rata_kelas = round(sum(r.rata_rata for r in rows) / len(rows), 1) if rows else 0
    return KelasSummary(
        teacher_id=teacher_id,
        teacher_name=guru["name"],
        kelas=guru.get("kelas") or "",
        jurusan=guru.get("jurusan") or "",
        kkm=KKM,
        jumlah_siswa=len(rows),
        rata_rata_kelas=rata_kelas,
        siswa_bermasalah=len([r for r in rows if not r.tuntas]),
        students=rows,
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
