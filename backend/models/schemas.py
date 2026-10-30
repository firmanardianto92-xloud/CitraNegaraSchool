"""Pydantic v2 models for the Citra Negara LMS."""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- jenjang & konfigurasi ----------
class Level(BaseModel):
    code: str  # sd | smp | sma | smk
    name: str
    jurusan: List[str] = []
    fees: Dict[str, float] = {}  # registrasi | booking | spp | seragam
    sample_note: str = ""


class LevelUpdate(BaseModel):
    name: Optional[str] = None
    jurusan: Optional[List[str]] = None
    fees: Optional[Dict[str, float]] = None
    sample_note: Optional[str] = None


class PublishPermission(BaseModel):
    can_publish: bool


# ---------- auth / users ----------
class User(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str
    email: str
    role: str  # siswa | guru | admin
    kelas: Optional[str] = None
    avatar_initials: str = ""
    level: Optional[str] = None  # sd | smp | sma | smk
    jurusan: Optional[str] = None
    nama_orang_tua: Optional[str] = None
    can_publish: bool = False  # guru: izin publikasi materi & pengajuan sosmed
    homeroom_teacher_id: Optional[str] = None  # siswa: guru wali yang mengampu


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
    created_by_id: str = ""
    target_level: Optional[str] = None
    target_jurusan: Optional[str] = None
    target_student_ids: List[str] = []
    created_at: datetime = Field(default_factory=_now)


class DocumentCreate(BaseModel):
    title: str
    type: str
    subject: str
    description: str = ""
    file_url: str = ""
    due_date: Optional[str] = None
    created_by: str = "Guru"
    created_by_id: str = ""
    target_level: Optional[str] = None
    target_jurusan: Optional[str] = None
    target_student_ids: List[str] = []


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


# ---------- publikasi sosial media ----------
class SocialPost(BaseModel):
    id: str = Field(default_factory=_uid)
    document_id: Optional[str] = None
    judul: str
    caption: str
    image_url: str = ""
    platform: str = "instagram"  # instagram | facebook
    status: str = "diajukan"  # diajukan | disetujui | ditolak | terpublikasi
    diajukan_oleh: str
    diajukan_oleh_id: str = ""
    catatan_review: str = ""
    direview_oleh: str = ""
    created_at: datetime = Field(default_factory=_now)


class SocialPostCreate(BaseModel):
    document_id: Optional[str] = None
    judul: str
    caption: str
    image_url: str = ""
    platform: str = "instagram"
    diajukan_oleh: str
    diajukan_oleh_id: str = ""


class SocialPostReview(BaseModel):
    status: str  # disetujui | ditolak | terpublikasi
    catatan_review: str = ""
    direview_oleh: str = ""


# ---------- rapor nilai ----------
class Grade(BaseModel):
    id: str = Field(default_factory=_uid)
    student_id: str
    student_name: str
    subject: str
    semester: str = "Semester 1 - 2025/2026"
    nilai_tugas: float = 0
    nilai_ujian: float = 0
    nilai_akhir: float = 0
    predikat: str = "C"
    catatan: str = ""
    guru: str = ""
    created_at: datetime = Field(default_factory=_now)


class GradeCreate(BaseModel):
    student_id: str
    student_name: str
    subject: str
    semester: str = "Semester 1 - 2025/2026"
    nilai_tugas: float = 0
    nilai_ujian: float = 0
    catatan: str = ""
    guru: str = ""


class GradeUpdate(BaseModel):
    nilai_tugas: Optional[float] = None
    nilai_ujian: Optional[float] = None
    catatan: Optional[str] = None


class MapelRow(BaseModel):
    subject: str
    nilai_tugas: Optional[float] = None
    nilai_ujian: Optional[float] = None
    nilai_akhir: Optional[float] = None
    predikat: Optional[str] = None
    catatan: str = ""
    grade_id: Optional[str] = None
    terisi: bool = False


class LembarRapor(BaseModel):
    student_id: str
    student_name: str
    kelas: str = ""
    jurusan: str = ""
    level: str = ""
    semester: str
    kkm: float = 75
    jumlah_terisi: int = 0
    rows: List[MapelRow] = []


class BatchGradeItem(BaseModel):
    subject: str
    nilai_tugas: Optional[float] = None
    nilai_ujian: Optional[float] = None
    catatan: str = ""


class BatchGradeCreate(BaseModel):
    student_id: str
    semester: str = ""
    guru: str = ""
    guru_id: str = ""
    items: List[BatchGradeItem] = []


class SemesterPoint(BaseModel):
    semester: str
    rata_rata: float
    predikat: str
    jumlah_mapel: int
    jumlah_merah: int


class TrenRapor(BaseModel):
    student_id: str
    student_name: str
    kkm: float = 75
    semesters: List[SemesterPoint] = []
    mapel_series: List[Dict] = []  # [{semester, "Matematika": 88, ...}]
    selisih_terakhir: float = 0


class CatatanWali(BaseModel):
    id: str = Field(default_factory=_uid)
    student_id: str
    student_name: str = ""
    semester: str = ""
    isi: str
    guru: str = ""
    guru_id: str = ""
    created_at: datetime = Field(default_factory=_now)


class CatatanWaliCreate(BaseModel):
    student_id: str
    isi: str
    semester: str = ""
    guru: str = ""
    guru_id: str = ""


class KelasStudentRow(BaseModel):
    student_id: str
    student_name: str
    kelas: str = ""
    jurusan: str = ""
    rata_rata: float = 0
    predikat: str = "-"
    jumlah_mapel: int = 0
    jumlah_merah: int = 0
    tuntas: bool = True
    grades: List["Grade"] = []


class KelasSummary(BaseModel):
    teacher_id: str
    teacher_name: str
    kelas: str = ""
    jurusan: str = ""
    kkm: float = 75
    jumlah_siswa: int = 0
    rata_rata_kelas: float = 0
    siswa_bermasalah: int = 0
    students: List[KelasStudentRow] = []


class RaporSummary(BaseModel):
    student_id: str
    student_name: str
    semester: str
    rata_rata: float
    predikat: str
    jumlah_mapel: int
    grades: List[Grade]


# ---------- ppdb ----------
class PpdbRegistration(BaseModel):
    id: str = Field(default_factory=_uid)
    nomor_pendaftaran: str
    nama_lengkap: str
    nisn: str
    asal_sekolah: str
    level: str = "smp"
    program: str = ""
    email: str
    telepon: str
    alamat: str = ""
    berkas_url: str = ""
    status: str = "menunggu_verifikasi"
    created_at: datetime = Field(default_factory=_now)


class PpdbCreate(BaseModel):
    nama_lengkap: str
    nisn: str
    asal_sekolah: str
    level: str = "smp"
    program: str = ""
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
    level: str = ""
    level_name: str = ""


class Invoice(BaseModel):
    id: str = Field(default_factory=_uid)
    nomor: str
    fee_code: str
    fee_name: str
    amount: float
    payer_name: str
    payer_ref: str = ""
    level: str = ""
    jurusan: str = ""
    kategori: str = "sekolah"  # admission | sekolah
    status: str = "belum_bayar"
    session_id: Optional[str] = None
    due_date: Optional[str] = None
    paid_at: Optional[datetime] = None
    receipt_no: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)


class InvoiceCreate(BaseModel):
    fee_code: str
    payer_name: str
    payer_ref: str = ""
    level: str = "smp"
    jurusan: str = ""
    kategori: str = "sekolah"


class Receipt(BaseModel):
    receipt_no: str
    invoice_no: str
    fee_name: str
    amount: float
    payer_name: str
    level_name: str = ""
    paid_at: Optional[datetime] = None
    metode: str = "Kartu Kredit/Debit (Stripe)"


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
    status: str = "terjadwal"
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
    role: str
    content: str
    created_at: datetime = Field(default_factory=_now)


# ---------- rekaman AI (transkrip + ringkasan) ----------
class KlipRekaman(BaseModel):
    idx: int
    start: Optional[float] = None  # detik; None bila transkripsi tanpa stempel waktu
    end: Optional[float] = None
    text: str


class RingkasanRekaman(BaseModel):
    judul: str = ""
    ringkasan: str = ""
    poin_penting: List[str] = []
    tindak_lanjut: List[str] = []
    topik: List[str] = []


class Rekaman(BaseModel):
    id: str = Field(default_factory=_uid)
    title: str
    filename: str
    content_type: str = ""
    size_bytes: int = 0
    language: str = ""  # kode ISO-639-1 ("id", "en") atau "" untuk deteksi otomatis
    owner_id: str
    owner_name: str = ""
    status: str = "memproses"  # memproses | selesai | gagal
    tahap: str = "Mengunggah"  # keterangan progres yang tampil di UI
    error: str = ""
    duration: Optional[float] = None
    transcript: str = ""
    clips: List[KlipRekaman] = []
    summary: Optional[RingkasanRekaman] = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class RekamanRingkas(BaseModel):
    """Baris daftar — tanpa transkrip/klip agar respons tetap ringan."""

    id: str
    title: str
    filename: str
    size_bytes: int = 0
    owner_name: str = ""
    status: str
    tahap: str = ""
    error: str = ""
    duration: Optional[float] = None
    jumlah_klip: int = 0
    created_at: datetime
