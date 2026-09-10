"""Pydantic v2 models for the Citra Negara LMS."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- auth ----------
class User(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str
    email: str
    role: str  # siswa | guru | admin
    kelas: Optional[str] = None
    avatar_initials: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------- documents / materi / tugas ----------
class Document(BaseModel):
    id: str = Field(default_factory=_uid)
    title: str
    type: str  # materi | tugas | dokumen
    subject: str
    description: str = ""
    file_url: str = ""
    due_date: Optional[str] = None
    created_by: str = "Admin Sekolah"
    created_at: datetime = Field(default_factory=_now)


class DocumentCreate(BaseModel):
    title: str
    type: str
    subject: str
    description: str = ""
    file_url: str = ""
    due_date: Optional[str] = None
    created_by: str = "Guru"


class Submission(BaseModel):
    id: str = Field(default_factory=_uid)
    document_id: str
    student_id: str
    student_name: str
    file_url: str
    note: str = ""
    status: str = "terkumpul"
    score: Optional[int] = None
    submitted_at: datetime = Field(default_factory=_now)


class SubmissionCreate(BaseModel):
    student_id: str
    student_name: str
    file_url: str
    note: str = ""


# ---------- ppdb ----------
class PpdbRegistration(BaseModel):
    id: str = Field(default_factory=_uid)
    nomor_pendaftaran: str
    nama_lengkap: str
    nisn: str
    asal_sekolah: str
    program: str
    email: str
    telepon: str
    alamat: str = ""
    berkas_url: str = ""
    status: str = "menunggu_verifikasi"  # menunggu_verifikasi | diverifikasi | diterima | ditolak
    created_at: datetime = Field(default_factory=_now)


class PpdbCreate(BaseModel):
    nama_lengkap: str
    nisn: str
    asal_sekolah: str
    program: str
    email: str
    telepon: str
    alamat: str = ""
    berkas_url: str = ""


class PpdbStatusUpdate(BaseModel):
    status: str


# ---------- payments ----------
class Fee(BaseModel):
    code: str
    name: str
    amount: float
    description: str = ""
    mandatory: bool = True


class Invoice(BaseModel):
    id: str = Field(default_factory=_uid)
    nomor: str
    fee_code: str
    fee_name: str
    amount: float
    payer_name: str
    payer_ref: str = ""  # registration id or student id
    status: str = "belum_bayar"  # belum_bayar | menunggu | lunas
    session_id: Optional[str] = None
    due_date: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class CheckoutRequest(BaseModel):
    invoice_id: str
    origin_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PaymentStatusResponse(BaseModel):
    session_id: str
    status: str
    payment_status: str
    invoice_id: Optional[str] = None


# ---------- mentoring ----------
class Mentor(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str
    bidang: str
    role: str = "Guru"
    slots: List[str] = []


class MentoringSession(BaseModel):
    id: str = Field(default_factory=_uid)
    mentor_id: str
    mentor_name: str
    student_id: str
    student_name: str
    topik: str
    kategori: str = "Akademik"
    jadwal: str
    catatan_mentor: str = ""
    meeting_link: str = ""
    status: str = "terjadwal"  # terjadwal | selesai | dibatalkan
    created_at: datetime = Field(default_factory=_now)


class MentoringCreate(BaseModel):
    mentor_id: str
    student_id: str
    student_name: str
    topik: str
    kategori: str = "Akademik"
    jadwal: str


class MentoringUpdate(BaseModel):
    status: Optional[str] = None
    catatan_mentor: Optional[str] = None


# ---------- chat ----------
class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatMessage(BaseModel):
    id: str = Field(default_factory=_uid)
    session_id: str
    role: str  # user | assistant
    content: str
    created_at: datetime = Field(default_factory=_now)
