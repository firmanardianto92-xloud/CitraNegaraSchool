"""Uji murni untuk lib/transkrip.py — tidak butuh server, Mongo, maupun kunci LLM."""

from lib.transkrip import (
    format_waktu,
    kelompokkan_klip,
    klip_dari_teks,
    normalisasi_segmen,
    parse_ringkasan,
)


class _Seg:  # meniru objek segmen dari SDK OpenAI
    def __init__(self, start, end, text):
        self.start, self.end, self.text = start, end, text


def test_normalisasi_segmen_dict_objek_dan_offset():
    segs = normalisasi_segmen([{"start": 0, "end": 2.5, "text": " Halo "}, _Seg(3, 5, "semua."), {"text": "  "}], offset=600)
    assert segs == [
        {"start": 600.0, "end": 602.5, "text": "Halo"},
        {"start": 603.0, "end": 605.0, "text": "semua."},
    ]


def test_kelompokkan_klip_berhenti_di_akhir_kalimat_dan_batas_maks():
    segs = [
        {"start": 0, "end": 5, "text": "Selamat pagi"},
        {"start": 5, "end": 13, "text": "anak-anak sekalian."},  # ≥12 dtk + titik → klip 1
        {"start": 13, "end": 25, "text": "Hari ini kita belajar"},
        {"start": 25, "end": 50, "text": "tentang hukum Newton tanpa titik"},  # ≥35 dtk → klip 2
        {"start": 50, "end": 52, "text": "Penutup."},
    ]
    klip = kelompokkan_klip(segs)
    assert [(k["idx"], k["start"], k["end"]) for k in klip] == [(0, 0, 13), (1, 13, 50), (2, 50, 52)]
    assert klip[0]["text"] == "Selamat pagi anak-anak sekalian."


def test_kelompokkan_klip_memutus_di_jeda_hening():
    segs = [{"start": 0, "end": 3, "text": "Halo"}, {"start": 600, "end": 604, "text": "lanjut"}]
    assert [(k["start"], k["end"]) for k in kelompokkan_klip(segs)] == [(0, 3), (600, 604)]


def test_klip_dari_teks_tanpa_stempel_waktu():
    teks = " ".join(["Ini kalimat yang cukup panjang untuk diuji." for _ in range(30)])
    klip = klip_dari_teks(teks)
    assert len(klip) > 1
    assert all(k["start"] is None and len(k["text"]) <= 420 for k in klip)
    assert " ".join(k["text"] for k in klip) == teks


def test_format_waktu():
    assert format_waktu(None) == "--:--"
    assert format_waktu(65.9) == "01:05"
    assert format_waktu(3725) == "1:02:05"


def test_parse_ringkasan_json_berpagar_dan_cadangan():
    raw = 'Berikut hasilnya:\n```json\n{"judul": "Rapat", "ringkasan": "Isi.", "poin_penting": ["a", ""], "topik": "rapat"}\n```'
    assert parse_ringkasan(raw) == {
        "judul": "Rapat",
        "ringkasan": "Isi.",
        "poin_penting": ["a"],
        "tindak_lanjut": [],
        "topik": ["rapat"],
    }
    cadangan = parse_ringkasan("Ringkasan bebas tanpa JSON")
    assert cadangan["ringkasan"] == "Ringkasan bebas tanpa JSON" and cadangan["poin_penting"] == []
