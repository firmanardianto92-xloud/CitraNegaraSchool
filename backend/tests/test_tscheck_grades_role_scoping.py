"""Backend coverage for guru-scoped access to /api/grades endpoints.

Criterion: Backend menolak guru yang mencoba mengakses/menyimpan nilai siswa kelas lain
(proteksi API langsung). Admin tetap dapat melihat semua siswa.
"""


def test_guru_ipa_can_access_own_student_lembar(client):
    resp = client.get("/grades/lembar/u-ipa-1", params={"guru_id": "u-guru-ipa"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["student_id"] == "u-ipa-1"
    assert body["jurusan"] == "IPA"


def test_guru_ipa_can_access_third_own_student_lembar(client):
    resp = client.get("/grades/lembar/u-ipa-3", params={"guru_id": "u-guru-ipa"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["student_id"] == "u-ipa-3"


def test_guru_ipa_blocked_from_ips_student_lembar(client):
    resp = client.get("/grades/lembar/u-ips-1", params={"guru_id": "u-guru-ipa"})
    assert resp.status_code == 403, resp.text


def test_guru_bahasa_blocked_from_ipa_student_lembar(client):
    resp = client.get("/grades/lembar/u-ipa-1", params={"guru_id": "u-guru-bahasa"})
    assert resp.status_code == 403, resp.text


def test_admin_can_access_any_student_lembar(client):
    resp = client.get("/grades/lembar/u-ipa-1", params={"guru_id": "u-admin-1"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["student_id"] == "u-ipa-1"


def test_guru_ips_blocked_from_saving_ipa_student_grades_and_value_unchanged(client):
    # Capture original value first
    before = client.get("/grades/lembar/u-ipa-1", params={"guru_id": "u-guru-ipa"})
    assert before.status_code == 200, before.text
    matematika_before = next(r for r in before.json()["rows"] if r["subject"] == "Matematika")
    assert matematika_before["nilai_akhir"] == 82.4

    resp = client.post(
        "/grades/batch",
        json={
            "student_id": "u-ipa-1",
            "guru_id": "u-guru-ips",
            "items": [{"subject": "Matematika", "nilai_tugas": 10, "nilai_ujian": 10}],
        },
    )
    assert resp.status_code == 403, resp.text

    after = client.get("/grades/lembar/u-ipa-1", params={"guru_id": "u-guru-ipa"})
    assert after.status_code == 200, after.text
    matematika_after = next(r for r in after.json()["rows"] if r["subject"] == "Matematika")
    assert matematika_after["nilai_akhir"] == 82.4, "nilai Matematika u-ipa-1 seharusnya tidak berubah"
