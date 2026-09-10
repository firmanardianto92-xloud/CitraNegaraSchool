# LMS Citra Negara — Spec

Portal sekolah (Bahasa Indonesia) untuk Sekolah Citra Negara. FastAPI + MongoDB + React 19.

## Peran & Login
Cookie httpOnly `citra_sid` (POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout).
Kata sandi semua akun demo: `citra123`.
- siswa@citranegara.sch.id — Ahmad Fauzi (siswa, XI RPL 1, id `u-siswa-1`)
- guru@citranegara.sch.id — Ibu Sri Wahyuni (guru, id `u-guru-1`)
- admin@citranegara.sch.id — Pak Hendra (admin, id `u-admin-1`)

## Koleksi Mongo
users, documents, submissions, ppdb, invoices, mentors, mentoring_sessions, chat_messages, payment_transactions.

## Endpoint utama (semua di /api)
- /auth/login | /auth/me | /auth/logout
- /documents (GET ?type=materi|tugas|dokumen&subject=&q=, POST, DELETE /{id}), /documents/{id}/submissions (GET, POST)
- /ppdb/registrations (GET, POST — otomatis membuat 2 invoice: registrasi + booking), PATCH /{id} status
- /payments/fees, /payments/invoices, /payments/checkout, /payments/status/{session_id}, /webhook/stripe
- /mentoring/mentors, /mentoring/sessions (GET, POST), PATCH /sessions/{id}
- /chat (POST) & /chat/history/{session_id} — Claude Sonnet 4.5 via EMERGENT_LLM_KEY

## Halaman
/, /login, /dashboard, /materi-tugas, /ppdb, /pembayaran, /mentoring, /ai-assistant, /payment/success, /payment/cancel

## Seed (backend/seed.py, idempotent, drop+insert)
3 user, 3 mentor (m-1 Sri Wahyuni, m-2 Budi Santoso, m-3 Rina Kartika), 10 dokumen (4 materi, 3 tugas, 3 dokumen resmi),
3 pendaftar PPDB (Dewi Anggraini menunggu_verifikasi, Rizky Pratama diverifikasi, Salsabila Putri diterima),
5 invoice (registrasi Ahmad Fauzi = lunas, sisanya belum_bayar), 2 sesi mentoring.

## Pembayaran
Stripe test mode via emergentintegrations (STRIPE_API_KEY=sk_test_emergent), currency IDR.
Kartu uji 4242 4242 4242 4242. Webhook di /api/webhook/stripe; status polling fallback di /api/payments/status/{id}.
