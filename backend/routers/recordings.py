"""Rekaman AI — unggah file rekaman → klip transkrip berstempel waktu + ringkasan.

Alur: POST /recordings menyimpan file lalu langsung membalas (status `memproses`);
pemrosesan berjalan di latar belakang (Whisper untuk transkripsi, Claude untuk
ringkasan) dan UI mem-poll GET /recordings/{id} sampai status `selesai`/`gagal`.
"""

import asyncio
import logging
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse

from lib.db import db
from lib.transkrip import (
    format_waktu,
    kelompokkan_klip,
    klip_dari_teks,
    normalisasi_segmen,
    parse_ringkasan,
    transkrip_bertanda,
)
from models.schemas import Rekaman, RekamanRingkas
from routers.auth import COOKIE

router = APIRouter(prefix="/recordings", tags=["recordings"])
logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "recordings"
MAX_UPLOAD_BYTES = 200 * 1024 * 1024
WHISPER_MAX_BYTES = 24 * 1024 * 1024  # batas API Whisper 25 MB, sisakan ruang
POTONGAN_DETIK = 600  # file besar dipecah per 10 menit
# Format yang diterima Whisper langsung; selain itu dikonversi dulu dengan ffmpeg.
FORMAT_WHISPER = {".flac", ".m4a", ".mp3", ".mp4", ".mpeg", ".mpga", ".oga", ".ogg", ".wav", ".webm"}
FORMAT_DITERIMA = FORMAT_WHISPER | {".aac", ".amr", ".3gp", ".mov", ".opus", ".wma", ".mkv"}
MAX_TRANSKRIP_KARAKTER = 80_000

SYSTEM_RINGKASAN = (
    "Kamu adalah asisten notulen Sekolah Citra Negara. Kamu menerima transkrip rekaman "
    "(rapat guru, pelajaran di kelas, wawancara, atau catatan suara) lengkap dengan stempel waktu. "
    "Tulis ringkasan dalam Bahasa Indonesia yang jelas dan faktual — jangan mengarang hal yang tidak ada di transkrip. "
    "Balas HANYA dengan satu objek JSON tanpa teks lain, dengan kunci: "
    '"judul" (maks 8 kata), "ringkasan" (1–2 paragraf), "poin_penting" (3–8 butir, '
    'sertakan stempel waktu [mm:ss] di awal butir bila relevan), "tindak_lanjut" (daftar tugas/keputusan; '
    'kosongkan bila tidak ada), "topik" (2–5 kata kunci).'
)

_tugas_latar: set = set()  # simpan referensi agar task tidak dibuang GC sebelum selesai


# ---------- helper akses ----------
async def _user_aktif(request: Request) -> dict:
    sid = request.cookies.get(COOKIE)
    user = await db.users.find_one({"id": sid}) if sid else None
    if not user:
        raise HTTPException(status_code=401, detail="Silakan masuk terlebih dahulu")
    return user


async def _rekaman_milik(request: Request, rec_id: str) -> dict:
    user = await _user_aktif(request)
    doc = await db.recordings.find_one({"id": rec_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Rekaman tidak ditemukan")
    if user["role"] != "admin" and doc["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Rekaman ini bukan milik Anda")
    return doc


def _api_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY belum diatur")
    return key


async def _perbarui(rec_id: str, **fields):
    fields["updated_at"] = datetime.now(timezone.utc)
    await db.recordings.update_one({"id": rec_id}, {"$set": fields})


# ---------- audio ----------
def _durasi(path: Path) -> Optional[float]:
    if not shutil.which("ffprobe"):
        return None
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=60, check=True,
        )
        return round(float(out.stdout.strip()), 2)
    except (subprocess.SubprocessError, ValueError):
        return None


def _siapkan_potongan(path: Path, workdir: Path) -> List[tuple]:
    """Kembalikan [(file, offset_detik)] yang siap dikirim ke Whisper.

    File kecil berformat didukung dikirim apa adanya. Selain itu ffmpeg mengecilkan ke
    mp3 mono 16 kHz (±14 MB/jam) dan memecahnya per 10 menit agar tiap potongan < 25 MB.
    """
    ext = path.suffix.lower()
    if ext in FORMAT_WHISPER and path.stat().st_size <= WHISPER_MAX_BYTES:
        return [(path, 0.0)]
    if not shutil.which("ffmpeg"):
        raise RuntimeError(
            "File lebih dari 24 MB atau formatnya perlu dikonversi, tetapi ffmpeg tidak tersedia di server"
        )
    pola = workdir / "potongan_%03d.mp3"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
            "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
            "-f", "segment", "-segment_time", str(POTONGAN_DETIK), "-reset_timestamps", "1", str(pola),
        ],
        capture_output=True, timeout=1800, check=True,
    )
    files = sorted(workdir.glob("potongan_*.mp3"))
    if not files:
        raise RuntimeError("Audio tidak dapat dibaca — pastikan file berisi suara")
    return [(f, i * float(POTONGAN_DETIK)) for i, f in enumerate(files)]


async def _transkripsi(stt: OpenAISpeechToText, file: Path, language: str):
    kwargs = {"model": "whisper-1"}
    if language:
        kwargs["language"] = language
    with open(file, "rb") as fh:
        try:
            resp = await stt.transcribe(
                file=fh, response_format="verbose_json", timestamp_granularities=["segment"], **kwargs
            )
        except TypeError:  # versi pustaka tanpa dukungan verbose_json → teks saja
            fh.seek(0)
            resp = await stt.transcribe(file=fh, response_format="json", **kwargs)
    text = resp.get("text", "") if isinstance(resp, dict) else getattr(resp, "text", "")
    segments = resp.get("segments") if isinstance(resp, dict) else getattr(resp, "segments", None)
    return (text or "").strip(), segments


async def _buat_ringkasan(rec_id: str, clips: List[dict]) -> dict:
    teks = transkrip_bertanda(clips)
    if len(teks) > MAX_TRANSKRIP_KARAKTER:
        teks = teks[:MAX_TRANSKRIP_KARAKTER] + "\n[... transkrip dipotong ...]"
    chat = LlmChat(
        api_key=_api_key(),
        session_id=f"rekaman-{rec_id}",
        system_message=SYSTEM_RINGKASAN,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    reply = await chat.send_message(UserMessage(text=f"Transkrip rekaman:\n\n{teks}"))
    return parse_ringkasan(str(reply))


async def _proses(rec_id: str, path: Path, language: str):
    try:
        stt = OpenAISpeechToText(api_key=_api_key())
        await _perbarui(rec_id, tahap="Menyiapkan audio")
        with tempfile.TemporaryDirectory() as tmp:
            potongan = await asyncio.to_thread(_siapkan_potongan, path, Path(tmp))
            semua_teks, semua_segmen = [], []
            for i, (file, offset) in enumerate(potongan, start=1):
                label = f" (bagian {i}/{len(potongan)})" if len(potongan) > 1 else ""
                await _perbarui(rec_id, tahap=f"Mentranskripsi suara{label}")
                text, segments = await _transkripsi(stt, file, language)
                semua_teks.append(text)
                semua_segmen.extend(normalisasi_segmen(segments, offset))

        transcript = " ".join(t for t in semua_teks if t).strip()
        if not transcript:
            raise RuntimeError("Tidak ada ucapan yang terdeteksi di rekaman ini")
        clips = kelompokkan_klip(semua_segmen) if semua_segmen else klip_dari_teks(transcript)
        durasi = await asyncio.to_thread(_durasi, path)
        if durasi is None and clips and clips[-1]["end"] is not None:
            durasi = clips[-1]["end"]
        await _perbarui(rec_id, tahap="Menyusun ringkasan", transcript=transcript, clips=clips, duration=durasi)

        try:
            summary = await _buat_ringkasan(rec_id, clips)
        except Exception as exc:  # transkrip tetap berguna walau ringkasan gagal
            logger.exception("ringkasan rekaman %s gagal", rec_id)
            await _perbarui(rec_id, status="selesai", tahap="Selesai", error=f"Ringkasan gagal dibuat: {exc}")
            return
        await _perbarui(rec_id, status="selesai", tahap="Selesai", summary=summary, error="")
    except Exception as exc:
        logger.exception("pemrosesan rekaman %s gagal", rec_id)
        detail = exc.stderr.decode(errors="ignore")[-300:] if isinstance(exc, subprocess.CalledProcessError) else str(exc)
        await _perbarui(rec_id, status="gagal", tahap="Gagal", error=detail or "Pemrosesan gagal")


async def tandai_terhenti():
    """Dipanggil saat server start: rekaman yang masih `memproses` pasti terputus restart."""
    await db.recordings.update_many(
        {"status": "memproses"},
        {"$set": {"status": "gagal", "tahap": "Gagal", "error": "Server dimulai ulang saat memproses — silakan unggah ulang"}},
    )


def _jalankan_latar(coro):
    task = asyncio.create_task(coro)
    _tugas_latar.add(task)
    task.add_done_callback(_tugas_latar.discard)


# ---------- endpoint ----------
@router.post("", response_model=Rekaman)
async def unggah(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(""),
    language: str = Form(""),
):
    user = await _user_aktif(request)
    nama = Path(file.filename or "rekaman").name
    ext = Path(nama).suffix.lower()
    if ext not in FORMAT_DITERIMA:
        raise HTTPException(
            status_code=400,
            detail=f"Format {ext or '(tanpa ekstensi)'} tidak didukung. Gunakan mp3, m4a, wav, webm, ogg, mp4, dll.",
        )
    language = language.strip().lower()[:5]

    rec = Rekaman(
        title=title.strip() or Path(nama).stem,
        filename=nama,
        content_type=file.content_type or "",
        language=language,
        owner_id=user["id"],
        owner_name=user.get("name", ""),
    )
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = UPLOAD_DIR / f"{rec.id}{ext}"
    size = 0
    try:
        with open(path, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Ukuran file maksimal 200 MB")
                out.write(chunk)
    except HTTPException:
        path.unlink(missing_ok=True)
        raise
    if size == 0:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="File kosong")

    rec.size_bytes = size
    rec.tahap = "Menunggu antrean"
    await db.recordings.insert_one({**rec.model_dump(), "stored_path": str(path)})
    _jalankan_latar(_proses(rec.id, path, language))
    return rec


@router.get("", response_model=List[RekamanRingkas])
async def daftar(request: Request):
    user = await _user_aktif(request)
    query = {} if user["role"] == "admin" else {"owner_id": user["id"]}
    rows = await db.recordings.find(query, {"transcript": 0, "summary": 0}).sort("created_at", -1).to_list(200)
    return [RekamanRingkas(**r, jumlah_klip=len(r.get("clips") or [])) for r in rows]


@router.get("/{rec_id}", response_model=Rekaman)
async def detail(rec_id: str, request: Request):
    return Rekaman(**await _rekaman_milik(request, rec_id))


@router.get("/{rec_id}/audio")
async def audio(rec_id: str, request: Request):
    doc = await _rekaman_milik(request, rec_id)
    path = Path(doc.get("stored_path", ""))
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File audio tidak ditemukan")
    return FileResponse(path, media_type=doc.get("content_type") or None, filename=doc["filename"])


@router.post("/{rec_id}/ringkasan", response_model=Rekaman)
async def ringkas_ulang(rec_id: str, request: Request):
    doc = await _rekaman_milik(request, rec_id)
    if not doc.get("clips"):
        raise HTTPException(status_code=400, detail="Transkrip belum tersedia")
    try:
        summary = await _buat_ringkasan(rec_id, doc["clips"])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ringkasan gagal dibuat: {exc}") from exc
    await _perbarui(rec_id, summary=summary, error="")
    return Rekaman(**await db.recordings.find_one({"id": rec_id}))


@router.get("/{rec_id}/export", response_class=PlainTextResponse)
async def ekspor(rec_id: str, request: Request, format: str = "txt"):
    doc = await _rekaman_milik(request, rec_id)
    clips = doc.get("clips") or []
    if format == "srt":
        def srt_waktu(d):
            d = d or 0.0
            ms = int(round(d * 1000))
            j, ms = divmod(ms, 3_600_000)
            m, ms = divmod(ms, 60_000)
            s, ms = divmod(ms, 1000)
            return f"{j:02d}:{m:02d}:{s:02d},{ms:03d}"

        isi = "\n".join(
            f"{i}\n{srt_waktu(c.get('start'))} --> {srt_waktu(c.get('end'))}\n{c['text']}\n"
            for i, c in enumerate(clips, start=1)
        )
    else:
        s = doc.get("summary") or {}
        bagian = [doc["title"], "=" * len(doc["title"]), ""]
        if s.get("ringkasan"):
            bagian += ["RINGKASAN", s["ringkasan"], ""]
        if s.get("poin_penting"):
            bagian += ["POIN PENTING", *[f"- {p}" for p in s["poin_penting"]], ""]
        if s.get("tindak_lanjut"):
            bagian += ["TINDAK LANJUT", *[f"- {p}" for p in s["tindak_lanjut"]], ""]
        bagian += ["TRANSKRIP", *[f"[{format_waktu(c.get('start'))}] {c['text']}" for c in clips]]
        isi = "\n".join(bagian)
    nama = f"{Path(doc['filename']).stem}.{'srt' if format == 'srt' else 'txt'}"
    return PlainTextResponse(isi, headers={"Content-Disposition": f'attachment; filename="{nama}"'})


@router.delete("/{rec_id}")
async def hapus(rec_id: str, request: Request):
    doc = await _rekaman_milik(request, rec_id)
    Path(doc.get("stored_path", "")).unlink(missing_ok=True)
    await db.recordings.delete_one({"id": rec_id})
    return {"ok": True}
