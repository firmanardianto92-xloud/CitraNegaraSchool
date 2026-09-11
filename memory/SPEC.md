# LMS Citra Negara — Spec

Portal sekolah (Bahasa Indonesia) untuk Sekolah Citra Negara. FastAPI + MongoDB + React 19.

## Peran & Login
Cookie httpOnly `citra_sid` (POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout).
Kata sandi semua akun demo: `citra123`.
- siswa@citranegara.sch.id — Ahmad Fauzi (siswa, SMK RPL, XI RPL 1, id `u-siswa-1`, orang tua: Bapak Sutrisno Fauzi)
- nadia@citranegara.sch.id — Nadia Rahma (siswa, SMA IPA, `u-siswa-2`)
- fajar@citranegara.sch.id — Fajar Nugroho (siswa, SMP, `u-siswa-3`)
- kayla@citranegara.sch.id — Kayla Zahra (siswa, SD, `u-siswa-4`)
- guru@citranegara.sch.id — Ibu Sri Wahyuni (guru, `u-guru-1`, can_publish=true)
- budi@citranegara.sch.id — Pak Budi Santoso (guru, `u-guru-2`, can_publish=true)
- rina@citranegara.sch.id — Ibu Rina Kartika (guru, `u-guru-3`, can_publish=FALSE → uji blokir izin)
- admin@citranegara.sch.id — Pak Hendra (admin, `u-admin-1`)

## Aturan peran
- **Guru**: publikasikan materi/tugas dengan target jenjang + jurusan + pilih siswa tertentu; ajukan publikasi sosmed (hanya jika `can_publish`); input nilai rapor. Guru tanpa izin → 403 saat POST /documents & /social/posts.
- **Siswa (sekaligus portal orang tua)**: hanya melihat dokumen yang ditujukan padanya (target_student_ids berisi id-nya, atau jenjang/jurusan cocok, atau tanpa target); tagihan hanya miliknya (payer_ref); kwitansi; rapor nilai sendiri.
- **Admin**: konfigurasi jenjang (SD/SMP/SMA/SMK) + jurusan + tarif 4 biaya; izin publikasi guru; review pengajuan sosmed; verifikasi PPDB.

## Jenjang & tarif (collection `levels`)
| code | jurusan | registrasi | booking | spp | seragam |
|---|---|---|---|---|---|
| sd | — | 200.000 | 1.200.000 | 450.000 | 900.000 |
| smp | — | 250.000 | 1.500.000 | 600.000 | 1.000.000 |
| sma | IPA, IPS, Bahasa | 300.000 | 2.000.000 | 750.000 | 1.200.000 |
| smk | RPL, Multimedia, Akuntansi, TKJ | 300.000 | 2.250.000 | 800.000 | 1.350.000 |

## Koleksi Mongo
users, documents, submissions, ppdb, invoices, mentors, mentoring_sessions, chat_messages,
payment_transactions, levels, grades, social_posts.

## Endpoint utama (semua di /api)
- /auth/login | /auth/me | /auth/logout
- /users?role=&level=&jurusan=
- /admin/levels (GET), /admin/levels/{code} (GET, PUT), /admin/teachers, PATCH /admin/teachers/{id}/publish-permission
- /documents?type=&q=&student_id=&created_by_id= (GET), POST /documents (403 bila guru tanpa izin), /documents/{id}/submissions
- /ppdb/registrations (GET, POST — tagihan admission otomatis sesuai tarif jenjang), PATCH /{id}
- /payments/fees?level=, /payments/invoices?payer_ref=&kategori=, POST /payments/invoices, /payments/checkout,
  /payments/status/{session_id}, GET /payments/invoices/{id}/receipt (400 bila belum lunas), /webhook/stripe
- /grades (GET, POST), /grades/rapor/{student_id}, PATCH /grades/{id} — nilai akhir = 40% tugas + 60% ujian
- /social/posts (GET, POST), PATCH /social/posts/{id} (disetujui|ditolak|terpublikasi)
- /mentoring/mentors, /mentoring/sessions, PATCH /sessions/{id}
- /chat (POST) & /chat/history/{session_id} — Claude Sonnet 4.5 via EMERGENT_LLM_KEY

## Halaman
/, /login, /dashboard, /materi-tugas, /ppdb, /pembayaran (tab Admission vs Pembayaran Sekolah),
/kwitansi/:invoiceId, /rapor, /mentoring, /ai-assistant, /admin (khusus admin),
/payment/success, /payment/cancel

## Seed (backend/seed.py, idempotent, drop+insert)
4 jenjang, 8 user, 12 dokumen (5 materi, 4 tugas, 3 dokumen resmi), 6 nilai (4 Ahmad, 2 Nadia),
12 invoice (registrasi+booking Ahmad lunas dengan kwitansi), 3 pendaftar PPDB, 2 pengajuan sosmed
(1 `diajukan` dari Pak Budi, 1 `terpublikasi`), 2 sesi mentoring, 3 mentor.

## Pembayaran
Stripe test mode via emergentintegrations (STRIPE_API_KEY=sk_test_emergent), currency IDR.
Kartu uji 4242 4242 4242 4242. Lunas → invoice dapat `receipt_no` + `paid_at` → kwitansi bisa dicetak.

## Deviasi yang disengaja
Publikasi ke sosial media berhenti di status `terpublikasi` di dalam sistem (alur persetujuan + preview caption).
Posting nyata ke Instagram/Facebook belum aktif karena butuh kredensial akun bisnis Meta.
