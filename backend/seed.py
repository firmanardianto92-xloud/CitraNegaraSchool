"""Idempotent seed data for LMS Citra Negara. Run: cd /app/backend && python seed.py"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes
from models.schemas import (
    Document, Grade, Invoice, Level, Mentor, MentoringSession, PpdbRegistration, SocialPost, User,
)

LEVELS = [
    Level(code="sd", name="SD - Sekolah Dasar", jurusan=[],
          fees={"registrasi": 200000, "booking": 1200000, "spp": 450000, "seragam": 900000},
          sample_note="Contoh: siswa kelas 1 SD membayar registrasi Rp 200.000 + booking Rp 1.200.000."),
    Level(code="smp", name="SMP - Sekolah Menengah Pertama", jurusan=[],
          fees={"registrasi": 250000, "booking": 1500000, "spp": 600000, "seragam": 1000000},
          sample_note="Contoh: siswa kelas 7 SMP membayar registrasi Rp 250.000 + booking Rp 1.500.000."),
    Level(code="sma", name="SMA - Sekolah Menengah Atas", jurusan=["IPA", "IPS", "Bahasa"],
          fees={"registrasi": 300000, "booking": 2000000, "spp": 750000, "seragam": 1200000},
          sample_note="Contoh: siswa SMA jurusan IPA membayar registrasi Rp 300.000 + booking Rp 2.000.000."),
    Level(code="smk", name="SMK - Sekolah Menengah Kejuruan", jurusan=["RPL", "Multimedia", "Akuntansi", "TKJ"],
          fees={"registrasi": 300000, "booking": 2250000, "spp": 800000, "seragam": 1350000},
          sample_note="Contoh: siswa SMK jurusan RPL membayar registrasi Rp 300.000 + booking Rp 2.250.000."),
]

USERS = [
    User(id="u-siswa-1", name="Ahmad Fauzi", email="siswa@citranegara.sch.id", role="siswa",
         kelas="XI RPL 1", avatar_initials="AF", level="smk", jurusan="RPL",
         nama_orang_tua="Bapak Sutrisno Fauzi", homeroom_teacher_id="u-guru-1"),
    User(id="u-siswa-2", name="Nadia Rahma", email="nadia@citranegara.sch.id", role="siswa",
         kelas="XI IPA 2", avatar_initials="NR", level="sma", jurusan="IPA",
         nama_orang_tua="Ibu Ratna Dewi", homeroom_teacher_id="u-guru-1"),
    User(id="u-siswa-3", name="Fajar Nugroho", email="fajar@citranegara.sch.id", role="siswa",
         kelas="VIII B", avatar_initials="FN", level="smp",
         nama_orang_tua="Bapak Agus Nugroho", homeroom_teacher_id="u-guru-1"),
    User(id="u-siswa-4", name="Kayla Zahra", email="kayla@citranegara.sch.id", role="siswa",
         kelas="V A", avatar_initials="KZ", level="sd",
         nama_orang_tua="Ibu Siti Kamila", homeroom_teacher_id="u-guru-1"),
    User(id="u-guru-1", name="Ibu Sri Wahyuni", email="guru@citranegara.sch.id", role="guru",
         kelas="Wali Kelas XI RPL 1", avatar_initials="SW", jurusan="RPL", can_publish=True),
    User(id="u-guru-2", name="Pak Budi Santoso", email="budi@citranegara.sch.id", role="guru",
         kelas="Guru Produktif RPL", avatar_initials="BS", can_publish=True),
    User(id="u-guru-3", name="Ibu Rina Kartika", email="rina@citranegara.sch.id", role="guru",
         kelas="Konselor BK & Sejarah", avatar_initials="RK", can_publish=False),
    User(id="u-guru-ipa", name="Pak Dedi Kurniawan", email="ipa@citranegara.sch.id", role="guru",
         kelas="Wali Kelas XI IPA 1", avatar_initials="DK", level="sma", jurusan="IPA", can_publish=True),
    User(id="u-guru-ips", name="Ibu Maya Lestari", email="ips@citranegara.sch.id", role="guru",
         kelas="Wali Kelas XI IPS 1", avatar_initials="ML", level="sma", jurusan="IPS", can_publish=True),
    User(id="u-guru-bahasa", name="Ibu Anisa Fitri", email="bahasa@citranegara.sch.id", role="guru",
         kelas="Wali Kelas XI Bahasa 1", avatar_initials="AF", level="sma", jurusan="Bahasa", can_publish=True),
    User(id="u-admin-1", name="Pak Hendra", email="admin@citranegara.sch.id", role="admin",
         kelas="Admin PPDB & Keuangan", avatar_initials="HD"),
]

# ---- 3 guru wali kelas × 10 siswa, mata pelajaran sesuai jurusan ----
MAPEL_UMUM = ["Matematika", "PPKN", "Bahasa Indonesia", "Bahasa Inggris", "Kesenian"]
JURUSAN_KELAS = {
    "IPA": {
        "teacher_id": "u-guru-ipa",
        "kelas": "XI IPA 1",
        "mapel": MAPEL_UMUM + ["Fisika", "Kimia", "Biologi"],
        "nama": ["Adinda Maharani", "Bagas Prakoso", "Cindy Oktaviani", "Dimas Aryaputra", "Elsa Nurhaliza",
                 "Farhan Maulana", "Gita Permatasari", "Hafiz Ramadhan", "Intan Puspita", "Joko Wicaksono"],
    },
    "IPS": {
        "teacher_id": "u-guru-ips",
        "kelas": "XI IPS 1",
        "mapel": MAPEL_UMUM + ["Ekonomi", "Sosiologi", "Geografi", "Sejarah"],
        "nama": ["Kevin Saputra", "Laila Ramadhani", "Maulana Yusuf", "Nabila Syifa", "Oki Firmansyah",
                 "Putri Ayu Lestari", "Qori Hidayat", "Rangga Pratomo", "Sabrina Amelia", "Taufik Hidayat"],
    },
    "Bahasa": {
        "teacher_id": "u-guru-bahasa",
        "kelas": "XI Bahasa 1",
        "mapel": MAPEL_UMUM + ["Sastra Indonesia", "Bahasa Jepang", "Bahasa Arab", "Antropologi"],
        "nama": ["Ulfa Khoirunnisa", "Vino Bastian Aji", "Wulan Sari Dewi", "Xena Alodia", "Yusuf Abdullah",
                 "Zahra Alifia", "Andini Pratiwi", "Bima Sakti Nugraha", "Clara Wijaya", "Denis Setiawan"],
    },
}


def _build_kelas_users() -> list:
    out = []
    for jurusan, cfg in JURUSAN_KELAS.items():
        slug = jurusan.lower()
        for idx, nama in enumerate(cfg["nama"], start=1):
            initials = "".join(w[0] for w in nama.split()[:2]).upper()
            out.append(User(
                id=f"u-{slug}-{idx}",
                name=nama,
                email=f"{slug}{idx}@citranegara.sch.id",
                role="siswa",
                kelas=cfg["kelas"],
                avatar_initials=initials,
                level="sma",
                jurusan=jurusan,
                nama_orang_tua=f"Orang tua {nama.split()[0]}",
                homeroom_teacher_id=cfg["teacher_id"],
            ))
    return out


KELAS_USERS = _build_kelas_users()

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
             file_url="https://citranegara.sch.id/materi/fisika-newton.pdf",
             created_by="Pak Budi Santoso", created_by_id="u-guru-2", target_level="sma", target_jurusan="IPA"),
    Document(title="Materi Aljabar Linear & Matriks", type="materi", subject="Matematika",
             description="Slide presentasi bab matriks dan determinan.",
             file_url="https://citranegara.sch.id/materi/matematika-matriks.pdf",
             created_by="Ibu Sri Wahyuni", created_by_id="u-guru-1", target_level="smk", target_jurusan="RPL"),
    Document(title="Dasar Pemrograman Web: HTML & CSS", type="materi", subject="Rekayasa Perangkat Lunak",
             description="Modul praktikum pembuatan halaman web statis.",
             file_url="https://citranegara.sch.id/materi/rpl-web.pdf",
             created_by="Pak Budi Santoso", created_by_id="u-guru-2",
             target_level="smk", target_jurusan="RPL", target_student_ids=["u-siswa-1"]),
    Document(title="Analisis Teks Eksposisi", type="materi", subject="Bahasa Indonesia",
             description="Struktur dan kaidah kebahasaan teks eksposisi.",
             file_url="https://citranegara.sch.id/materi/bindo-eksposisi.pdf",
             created_by="Ibu Sri Wahyuni", created_by_id="u-guru-1"),
    Document(title="Matematika Dasar: Pecahan & Desimal", type="materi", subject="Matematika",
             description="Modul latihan pecahan untuk siswa SD kelas 5.",
             file_url="https://citranegara.sch.id/materi/sd-pecahan.pdf",
             created_by="Ibu Sri Wahyuni", created_by_id="u-guru-1", target_level="sd"),
    Document(title="Tugas 1 - Latihan Soal Matriks", type="tugas", subject="Matematika",
             description="Kerjakan 15 soal matriks pada modul halaman 22-25.", due_date=_due(4),
             file_url="https://citranegara.sch.id/tugas/matematika-1.pdf",
             created_by="Ibu Sri Wahyuni", created_by_id="u-guru-1",
             target_level="smk", target_jurusan="RPL", target_student_ids=["u-siswa-1"]),
    Document(title="Tugas Proyek - Website Portofolio", type="tugas", subject="Rekayasa Perangkat Lunak",
             description="Buat website portofolio pribadi menggunakan HTML & CSS.", due_date=_due(10),
             file_url="https://citranegara.sch.id/tugas/rpl-proyek.pdf",
             created_by="Pak Budi Santoso", created_by_id="u-guru-2", target_level="smk", target_jurusan="RPL"),
    Document(title="Tugas Esai Sejarah Kemerdekaan", type="tugas", subject="Sejarah",
             description="Tulis esai 800 kata tentang peran pemuda dalam kemerdekaan.", due_date=_due(-2),
             file_url="https://citranegara.sch.id/tugas/sejarah-esai.pdf",
             created_by="Ibu Rina Kartika", created_by_id="u-guru-3"),
    Document(title="Tugas Praktikum Biologi - Sel Tumbuhan", type="tugas", subject="Biologi",
             description="Laporan pengamatan sel tumbuhan dengan mikroskop.", due_date=_due(6),
             file_url="https://citranegara.sch.id/tugas/bio-sel.pdf",
             created_by="Pak Budi Santoso", created_by_id="u-guru-2", target_level="sma", target_jurusan="IPA"),
    Document(title="Kalender Akademik 2025/2026", type="dokumen", subject="Administrasi",
             description="Jadwal resmi kegiatan belajar, ujian, dan libur sekolah.",
             file_url="https://citranegara.sch.id/dokumen/kalender-akademik.pdf",
             created_by="Pak Hendra", created_by_id="u-admin-1"),
    Document(title="Kurikulum Merdeka - Panduan Sekolah", type="dokumen", subject="Administrasi",
             description="Panduan implementasi Kurikulum Merdeka di Citra Negara.",
             file_url="https://citranegara.sch.id/dokumen/kurikulum-merdeka.pdf",
             created_by="Pak Hendra", created_by_id="u-admin-1"),
    Document(title="Formulir Surat Keterangan Siswa Aktif", type="dokumen", subject="Administrasi",
             description="Template surat keterangan siswa aktif untuk keperluan administrasi.",
             file_url="https://citranegara.sch.id/dokumen/surat-aktif.docx",
             created_by="Pak Hendra", created_by_id="u-admin-1"),
]

PPDB = [
    PpdbRegistration(nomor_pendaftaran="PPDB-2026-1001", nama_lengkap="Dewi Anggraini", nisn="0071234501",
                     asal_sekolah="SMP Negeri 3 Depok", level="smk", program="RPL",
                     email="dewi@example.com", telepon="081234567801", alamat="Jl. Melati No. 12, Depok",
                     status="menunggu_verifikasi"),
    PpdbRegistration(nomor_pendaftaran="PPDB-2026-1002", nama_lengkap="Rizky Pratama", nisn="0071234502",
                     asal_sekolah="SMP Islam Al-Azhar", level="sma", program="IPA",
                     email="rizky@example.com", telepon="081234567802", alamat="Jl. Kenanga No. 5, Jakarta",
                     status="diverifikasi"),
    PpdbRegistration(nomor_pendaftaran="PPDB-2026-1003", nama_lengkap="Salsabila Putri", nisn="0071234503",
                     asal_sekolah="SD Negeri 1 Bogor", level="smp", program="",
                     email="salsa@example.com", telepon="081234567803", alamat="Jl. Anggrek No. 9, Bogor",
                     status="diterima"),
]

GRADES_RAW = [
    ("u-siswa-1", "Ahmad Fauzi", "Matematika", 88, 92, "Konsisten dan teliti dalam pengerjaan soal.", "Ibu Sri Wahyuni"),
    ("u-siswa-1", "Ahmad Fauzi", "Rekayasa Perangkat Lunak", 95, 90, "Sangat menonjol pada praktik pemrograman.", "Pak Budi Santoso"),
    ("u-siswa-1", "Ahmad Fauzi", "Bahasa Indonesia", 80, 78, "Perlu memperkuat struktur paragraf.", "Ibu Sri Wahyuni"),
    ("u-siswa-1", "Ahmad Fauzi", "Sejarah", 75, 70, "Tingkatkan pemahaman kronologi peristiwa.", "Ibu Rina Kartika"),
    ("u-siswa-2", "Nadia Rahma", "Fisika", 90, 86, "Baik dalam analisis soal hitungan.", "Pak Budi Santoso"),
    ("u-siswa-2", "Nadia Rahma", "Biologi", 85, 88, "Laporan praktikum rapi dan lengkap.", "Pak Budi Santoso"),
]


def _predikat(n: float) -> str:
    return "A" if n >= 90 else "B" if n >= 80 else "C" if n >= 70 else "D" if n >= 60 else "E"


SOCIAL = [
    SocialPost(judul="Praktikum RPL: Siswa Membangun Website Portofolio",
               caption="Hasil pengajaran kelas XI RPL 1 — siswa berhasil membangun website portofolio pertama mereka. "
                       "Bangga dengan progres anak-anak! #CitraNegara #RPL #KurikulumMerdeka",
               image_url="https://images.unsplash.com/photo-1759922378123-a1f4f1e39bae?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
               platform="instagram", status="diajukan",
               diajukan_oleh="Pak Budi Santoso", diajukan_oleh_id="u-guru-2"),
    SocialPost(judul="Kelas Matematika Interaktif: Bedah Soal Matriks",
               caption="Sesi bedah soal matriks bersama siswa SMK Citra Negara. Belajar jadi lebih seru! "
                       "#CitraNegara #Matematika",
               image_url="https://images.unsplash.com/photo-1664382953647-5c6c76dd63b9?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
               platform="facebook", status="terpublikasi",
               diajukan_oleh="Ibu Sri Wahyuni", diajukan_oleh_id="u-guru-1",
               catatan_review="Disetujui, caption sudah sesuai pedoman humas.", direview_oleh="Pak Hendra"),
]


async def main():
    for name in ["users", "documents", "submissions", "ppdb", "invoices", "mentors",
                 "mentoring_sessions", "chat_messages", "payment_transactions",
                 "levels", "grades", "social_posts"]:
        await db[name].drop()
    await ensure_indexes()

    await db.levels.insert_many([lv.model_dump() for lv in LEVELS])
    await db.users.insert_many([u.model_dump() for u in USERS + KELAS_USERS])
    await db.mentors.insert_many([m.model_dump() for m in MENTORS])
    await db.documents.insert_many([d.model_dump() for d in DOCUMENTS])
    await db.ppdb.insert_many([p.model_dump() for p in PPDB])
    await db.social_posts.insert_many([s.model_dump() for s in SOCIAL])

    grades = []
    for sid, sname, subject, tugas, ujian, catatan, guru in GRADES_RAW:
        akhir = round(tugas * 0.4 + ujian * 0.6, 1)
        grades.append(Grade(student_id=sid, student_name=sname, subject=subject, nilai_tugas=tugas,
                            nilai_ujian=ujian, nilai_akhir=akhir, predikat=_predikat(akhir),
                            catatan=catatan, guru=guru).model_dump())

    # Nilai 10 siswa per kelas (IPA/IPS/Bahasa) — sengaja beragam agar ada nilai merah (<75).
    rng = random.Random(20260101)
    CATATAN_BAIK = ["Konsisten dan teliti.", "Aktif bertanya di kelas.", "Pemahaman konsep sangat baik.",
                    "Tugas selalu dikumpulkan tepat waktu."]
    CATATAN_MERAH = ["Perlu pendampingan tambahan.", "Banyak tugas belum dikumpulkan.",
                     "Disarankan mengikuti remedial.", "Perlu memperkuat dasar materi."]
    guru_nama = {u.id: u.name for u in USERS}

    for jurusan, cfg in JURUSAN_KELAS.items():
        guru_label = guru_nama[cfg["teacher_id"]]
        for idx, nama in enumerate(cfg["nama"], start=1):
            sid = f"u-{jurusan.lower()}-{idx}"
            # 3 siswa pertama tiap kelas diberi beberapa nilai merah, sisanya mayoritas tuntas.
            rawan = idx <= 3
            for subject in cfg["mapel"]:
                if rawan and rng.random() < 0.45:
                    tugas, ujian = rng.randint(50, 70), rng.randint(48, 72)
                else:
                    tugas, ujian = rng.randint(76, 98), rng.randint(74, 97)
                akhir = round(tugas * 0.4 + ujian * 0.6, 1)
                catatan = rng.choice(CATATAN_MERAH if akhir < 75 else CATATAN_BAIK)
                grades.append(Grade(student_id=sid, student_name=nama, subject=subject,
                                    nilai_tugas=tugas, nilai_ujian=ujian, nilai_akhir=akhir,
                                    predikat=_predikat(akhir), catatan=catatan,
                                    guru=guru_label).model_dump())
    await db.grades.insert_many(grades)

    fee_meta = {
        "registrasi": ("Biaya Formulir & Pendaftaran PPDB", "admission"),
        "booking": ("Biaya Booking Kursi / Uang Pangkal Awal", "admission"),
        "spp": ("SPP Bulanan / Iuran Pembelajaran", "sekolah"),
        "seragam": ("Seragam & Buku Paket Digital", "sekolah"),
    }
    level_map = {lv.code: lv for lv in LEVELS}
    invoices = []

    def add_invoice(code, user, status):
        lv = level_map[user.level]
        name, kategori = fee_meta[code]
        paid = status == "lunas"
        invoices.append(Invoice(
            nomor=f"INV-{random.randint(100000, 999999)}", fee_code=code, fee_name=name,
            amount=float(lv.fees[code]), payer_name=user.name, payer_ref=user.id,
            level=lv.code, jurusan=user.jurusan or "", kategori=kategori, status=status,
            due_date=_due(14),
            paid_at=datetime.now(timezone.utc) - timedelta(days=5) if paid else None,
            receipt_no=f"KW-{random.randint(100000, 999999)}" if paid else None,
        ).model_dump())

    siswa = {u.id: u for u in USERS if u.role == "siswa"}
    add_invoice("registrasi", siswa["u-siswa-1"], "lunas")
    add_invoice("booking", siswa["u-siswa-1"], "lunas")
    add_invoice("spp", siswa["u-siswa-1"], "belum_bayar")
    add_invoice("seragam", siswa["u-siswa-1"], "belum_bayar")
    add_invoice("registrasi", siswa["u-siswa-2"], "lunas")
    add_invoice("spp", siswa["u-siswa-2"], "belum_bayar")
    add_invoice("spp", siswa["u-siswa-3"], "belum_bayar")
    add_invoice("registrasi", siswa["u-siswa-4"], "belum_bayar")

    for reg in PPDB[:2]:
        lv = level_map[reg.level]
        for code in ("registrasi", "booking"):
            name, kategori = fee_meta[code]
            invoices.append(Invoice(
                nomor=f"INV-{random.randint(100000, 999999)}", fee_code=code, fee_name=name,
                amount=float(lv.fees[code]), payer_name=reg.nama_lengkap, payer_ref=reg.id,
                level=lv.code, jurusan=reg.program, kategori=kategori, status="belum_bayar",
                due_date=_due(7),
            ).model_dump())
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
    print(f"Seed selesai: {len(LEVELS)} jenjang, {len(USERS) + len(KELAS_USERS)} user "
          f"({len(KELAS_USERS)} siswa kelas IPA/IPS/Bahasa), {len(DOCUMENTS)} dokumen, "
          f"{len(grades)} nilai, {len(invoices)} invoice, {len(SOCIAL)} pengajuan sosmed.")


if __name__ == "__main__":
    asyncio.run(main())
