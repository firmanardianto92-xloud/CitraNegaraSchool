"""Logika murni untuk fitur Rekaman AI: pengelompokan klip & parsing ringkasan.

Tidak menyentuh Mongo maupun jaringan, jadi bisa diuji langsung dengan pytest.
"""

import json
import re
from typing import Any, Iterable, List, Optional

# Klip ditutup begitu panjangnya mencapai batas ini, atau lebih awal di akhir kalimat
# setelah melewati MIN — sehingga tiap klip enak dibaca & diputar ulang.
KLIP_MIN_DETIK = 12.0
KLIP_MAX_DETIK = 35.0
KLIP_MAX_KARAKTER = 420
KLIP_JEDA_DETIK = 4.0  # jeda hening sepanjang ini selalu memulai klip baru  # untuk transkrip tanpa stempel waktu

_AKHIR_KALIMAT = re.compile(r"[.!?…]['\"”)]*$")


def _ambil(obj: Any, key: str, default=None):
    """Segmen Whisper bisa berupa dict atau objek pydantic SDK OpenAI."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def normalisasi_segmen(segments: Optional[Iterable[Any]], offset: float = 0.0) -> List[dict]:
    hasil = []
    for seg in segments or []:
        text = str(_ambil(seg, "text", "") or "").strip()
        if not text:
            continue
        start = float(_ambil(seg, "start", 0.0) or 0.0) + offset
        end = float(_ambil(seg, "end", start - offset) or 0.0) + offset
        hasil.append({"start": round(start, 2), "end": round(max(end, start), 2), "text": text})
    return hasil


def kelompokkan_klip(segments: List[dict]) -> List[dict]:
    """Gabungkan segmen Whisper (biasanya 2–8 detik) menjadi klip 12–35 detik."""
    klip: List[dict] = []
    cur: Optional[dict] = None
    for seg in segments:
        if cur is not None and seg["start"] - cur["end"] >= KLIP_JEDA_DETIK:
            klip.append(cur)
            cur = None
        if cur is None:
            cur = {"start": seg["start"], "end": seg["end"], "text": seg["text"]}
        else:
            cur["end"] = seg["end"]
            cur["text"] = f"{cur['text']} {seg['text']}"
        durasi = cur["end"] - cur["start"]
        if durasi >= KLIP_MAX_DETIK or (durasi >= KLIP_MIN_DETIK and _AKHIR_KALIMAT.search(cur["text"])):
            klip.append(cur)
            cur = None
    if cur is not None:
        klip.append(cur)
    return [{"idx": i, **k} for i, k in enumerate(klip)]


def klip_dari_teks(text: str) -> List[dict]:
    """Cadangan bila transkripsi tidak memberi stempel waktu: potong per kalimat."""
    kalimat = [k.strip() for k in re.split(r"(?<=[.!?…])\s+", text.strip()) if k.strip()]
    klip: List[str] = []
    buf = ""
    for k in kalimat:
        if buf and len(buf) + len(k) + 1 > KLIP_MAX_KARAKTER:
            klip.append(buf)
            buf = k
        else:
            buf = f"{buf} {k}".strip()
    if buf:
        klip.append(buf)
    return [{"idx": i, "start": None, "end": None, "text": t} for i, t in enumerate(klip)]


def format_waktu(detik: Optional[float]) -> str:
    if detik is None:
        return "--:--"
    total = int(detik)
    j, sisa = divmod(total, 3600)
    m, s = divmod(sisa, 60)
    return f"{j}:{m:02d}:{s:02d}" if j else f"{m:02d}:{s:02d}"


def transkrip_bertanda(clips: List[dict]) -> str:
    return "\n".join(f"[{format_waktu(c.get('start'))}] {c['text']}" for c in clips)


def _daftar_teks(nilai: Any) -> List[str]:
    if isinstance(nilai, str):
        nilai = [nilai]
    if not isinstance(nilai, list):
        return []
    return [str(x).strip() for x in nilai if str(x).strip()]


def parse_ringkasan(raw: str) -> dict:
    """Ambil objek JSON dari balasan LLM (boleh dibungkus ```json atau berisi teks lain).

    Bila tidak ada JSON yang valid, seluruh balasan dipakai sebagai paragraf ringkasan
    agar pengguna tetap mendapat hasil.
    """
    teks = (raw or "").strip()
    data = None
    mulai, akhir = teks.find("{"), teks.rfind("}")
    if mulai != -1 and akhir > mulai:
        try:
            data = json.loads(teks[mulai : akhir + 1])
        except json.JSONDecodeError:
            data = None
    if not isinstance(data, dict):
        bersih = re.sub(r"^```\w*|```$", "", teks, flags=re.MULTILINE).strip()
        return {"judul": "", "ringkasan": bersih, "poin_penting": [], "tindak_lanjut": [], "topik": []}
    return {
        "judul": str(data.get("judul", "") or "").strip(),
        "ringkasan": str(data.get("ringkasan", "") or "").strip(),
        "poin_penting": _daftar_teks(data.get("poin_penting")),
        "tindak_lanjut": _daftar_teks(data.get("tindak_lanjut")),
        "topik": _daftar_teks(data.get("topik")),
    }
