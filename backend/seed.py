"""Idempotent seed data for LMS Citra Negara. Run: cd /app/backend && python seed.py"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes
from models.schemas import Document, Invoice, Mentor, MentoringSession, PpdbRegistration, User

USERS = [
    User(id="u-siswa-1", name="Ahmad Fauzi", email="siswa@citranegara.sch.id", role="siswa",
         kelas="XI RPL 1", avatar_initials="AF"),
    User(id="u-guru-1", name="Ibu Sri Wahyuni", email="guru@citranegara.sch.id", role="guru",
         kelas="Wali Kelas XI RPL 1", avatar_initials="SW"),
    User(id="u-admin-1", name="Pak Hendra", email="admin@citranegara.sch.id", role="admin",
         kelas="Admin PPDB & Keuangan", avatar_initials="HD"),
]

MENTORS = [
    Mentor(id="m-1", name="Ibu Sri Wahyuni", bidang="Matematika & Persiapan Ujian", role="Guru",
           slots=["Senin 09:00", "Rabu 13:00", "Jumat 10:00"]),
    Mentor(id="m-2", name="Pak Budi Santoso", bidang="Rekayasa Perangkat Lunak", role="Guru Produktif",
           slots=["Selasa 10:00", "Kamis 14:00"]),
    Mentor(id="m-3", name="Ibu Rina Kartika", bidang="Bimbingan Konseling & Karir", role="Konselor BK",
           slots=["Senin 14:00", "Rabu 09:00", "Jumat 13:00"]),
]


def _due(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).date().isoformat()


DOCUMENTS = [
    Document(title="Modul Hukum Newton & Dinamika Gerak", type="materi", subject="Fisika",
             description="Rangkuman lengkap Hukum Newton I-III beserta contoh soal.",
             file_url="https://citranegara.sch.id/materi/fisika-newton.pdf", created_by="Pak Budi Santoso"),
    Document(title="Materi Aljabar Linear & Matriks", type="materi", subject="Matematika",
             description="Slide presentasi bab matriks dan determinan.",
             file_url="https://citranegara.sch.id/materi/matematika-matriks.pdf", created_by="Ibu Sri Wahyuni"),
    Document(title="Dasar Pemrograman Web: HTML & CSS", type="materi", subject="Rekayasa Perangkat Lunak",
             description="Modul praktikum pembuatan halaman web statis.",
             file_url="https://citranegara.sch.id/materi/rpl-web.pdf", created_by="Pak Budi Santoso"),
    Document(title="Analisis Teks Eksposisi", type="materi", subject="Bahasa Indonesia",
             description="Struktur dan kaidah kebahasaan teks eksposisi.",
             file_url="https://citranegara.sch.id/materi/bindo-eksposisi.pdf", created_by="Ibu Sri Wahyuni"),
    Document(title="Tugas 1 - Latihan Soal Matriks", type="tugas", subject="Matematika",
             description="Kerjakan 15 soal matriks pada modul halaman 22-25.", due_date=_due(4),
             file_url="https://citranegara.sch.id/tugas/matematika-1.pdf", created_by="Ibu Sri Wahyuni"),
    Document(title="Tugas Proyek - Website Portofolio", type="tugas", subject="Rekayasa Perangkat Lunak",
             description="Buat website portofolio pribadi menggunakan HTML & CSS.", due_date=_due(10),
             file_url="https://citranegara.sch.id/tugas/rpl-proyek.pdf", created_by="Pak Budi Santoso"),
    Document(title="Tugas Esai Sejarah Kemerdekaan", type="tugas", subject="Sejarah",
             description="Tulis esai 800 kata tentang peran pemuda dalam kemerdekaan.", due_date=_due(-2),
             file_url="https://citranegara.sch.id/tugas/sejarah-esai.pdf", created_by="Ibu Rina Kartika"),
    Document(title="Kalender Akademik 2025/2026", type="dokumen", subject="Administrasi",
             description="Jadwal resmi kegiatan belajar, ujian, dan libur sekolah.",
             file_url="https://citranegara.sch.id/dokumen/kalender-akademik.pdf", created_by="Pak Hendra"),
    Document(title="Kurikulum Merdeka - Panduan Sekolah", type="dokumen", subject="Administrasi",
             description="Panduan implementasi Kurikulum Merdeka di Citra Negara.",
             file_url="https://citranegara.sch.id/dokumen/kurikulum-merdeka.pdf", created_by="Pak Hendra"),
    Document(title="Formulir Surat Keterangan Siswa Aktif", type="dokumen", subject="Administrasi",
             description="Template surat keterangan siswa aktif untuk keperluan administrasi.",
             file_url="https://citranegara.sch.id/dokumen/surat-aktif.docx", created_by="Pak Hendra"),
]

PPDB = [
    PpdbRegistration(nomor_pendaftaran="PPDB-2026-1001", nama_lengkap="Dewi Anggraini", nisn="0071234501",
                     asal_sekolah="SMP Negeri 3 Depok", program="Rekayasa Perangkat Lunak",
                     email="dewi@example.com", telepon="081234567801", alamat="Jl. Melati No. 12, Depok",
                     status="menunggu_verifikasi"),
    PpdbRegistration(nomor_pendaftaran="PPDB-2026-1002", nama_lengkap="Rizky Pratama", nisn="0071234502",
                     asal_sekolah="SMP Islam Al-Azhar", program="IPA",
                     email="rizky@example.com", telepon="081234567802", alamat="Jl. Kenanga No. 5, Jakarta",
                     status="diverifikasi"),
    PpdbRegistration(nomor_pendaftaran="PPDB-2026-1003", nama_lengkap="Salsabila Putri", nisn="0071234503",
                     asal_sekolah="SMP Negeri 1 Bogor", program="IPS",
                     email="salsa@example.com", telepon="081234567803", alamat="Jl. Anggrek No. 9, Bogor",
                     status="diterima"),
]

FEE_ROWS = [
    ("registrasi", "Biaya Formulir & Pendaftaran PPDB", 250000.0, "lunas"),
    ("booking", "Biaya Booking Kursi / Uang Pangkal Awal", 1500000.0, "belum_bayar"),
    ("spp", "SPP Bulanan / Iuran Pembelajaran", 650000.0, "belum_bayar"),
    ("seragam", "Seragam & Buku Paket Digital", 1200000.0, "belum_bayar"),
]


async def main():
    for name in ["users", "documents", "submissions", "ppdb", "invoices", "mentors",
                 "mentoring_sessions", "chat_messages", "payment_transactions"]:
        await db[name].drop()
    await ensure_indexes()

    await db.users.insert_many([u.model_dump() for u in USERS])
    await db.mentors.insert_many([m.model_dump() for m in MENTORS])
    await db.documents.insert_many([d.model_dump() for d in DOCUMENTS])
    await db.ppdb.insert_many([p.model_dump() for p in PPDB])

    invoices = []
    for code, name, amount, status in FEE_ROWS:
        invoices.append(Invoice(nomor=f"INV-{random.randint(100000, 999999)}", fee_code=code, fee_name=name,
                                amount=amount, payer_name="Ahmad Fauzi", payer_ref="u-siswa-1",
                                status=status, due_date=_due(14)).model_dump())
    invoices.append(Invoice(nomor=f"INV-{random.randint(100000, 999999)}", fee_code="registrasi",
                            fee_name="Biaya Formulir & Pendaftaran PPDB", amount=250000.0,
                            payer_name="Dewi Anggraini", payer_ref=PPDB[0].id, status="belum_bayar",
                            due_date=_due(7)).model_dump())
    await db.invoices.insert_many(invoices)

    sessions = [
        MentoringSession(mentor_id="m-1", mentor_name="Ibu Sri Wahyuni", student_id="u-siswa-1",
                         student_name="Ahmad Fauzi", topik="Persiapan Ujian Matematika",
                         kategori="Akademik", jadwal="Senin 09:00",
                         meeting_link="https://meet.citranegara.sch.id/482913",
                         catatan_mentor="Fokus pada bab matriks dan trigonometri.", status="selesai"),
        MentoringSession(mentor_id="m-3", mentor_name="Ibu Rina Kartika", student_id="u-siswa-1",
                         student_name="Ahmad Fauzi", topik="Konsultasi Pilihan Jurusan Kuliah",
                         kategori="Karir", jadwal="Rabu 09:00",
                         meeting_link="https://meet.citranegara.sch.id/119284", status="terjadwal"),
    ]
    await db.mentoring_sessions.insert_many([s.model_dump() for s in sessions])
    print("Seed selesai: users, mentors, documents, ppdb, invoices, mentoring sessions.")


if __name__ == "__main__":
    asyncio.run(main())
