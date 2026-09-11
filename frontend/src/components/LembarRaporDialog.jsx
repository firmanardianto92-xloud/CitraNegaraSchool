import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Loader2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";

const PREDIKAT_CLASS = {
  A: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  B: "bg-[#EFF6FF] text-[#1D4ED8] border-transparent",
  C: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  D: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
  E: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
};

const hitung = (tugas, ujian) => {
  if (tugas === "" && ujian === "") return null;
  const t = Number(tugas) || 0;
  const u = Number(ujian) || 0;
  return Math.round((t * 0.4 + u * 0.6) * 10) / 10;
};

const predikatOf = (n) => {
  if (n === null) return null;
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "E";
};

/** Lembar pengisian rapor: semua mapel siswa sudah terdaftar, guru cukup mengisi angka. */
export default function LembarRaporDialog({ students, defaultStudentId, onSaved }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState(defaultStudentId || "");
  const [draft, setDraft] = useState([]);
  const [isiCepat, setIsiCepat] = useState("");

  useEffect(() => {
    if (defaultStudentId) setStudentId(defaultStudentId);
  }, [defaultStudentId]);

  const lembar = useQuery({
    queryKey: ["lembar", studentId],
    queryFn: () => apiGet(`/grades/lembar/${studentId}`),
    enabled: Boolean(studentId),
  });

  // Prefill draft dari nilai yang sudah ada
  useEffect(() => {
    if (lembar.data) {
      setDraft(
        lembar.data.rows.map((r) => ({
          subject: r.subject,
          nilai_tugas: r.nilai_tugas ?? "",
          nilai_ujian: r.nilai_ujian ?? "",
          catatan: r.catatan ?? "",
          terisi: r.terisi,
        })),
      );
    }
  }, [lembar.data]);

  const set = (idx, field, value) =>
    setDraft((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

  const terisi = useMemo(
    () => draft.filter((r) => r.nilai_tugas !== "" || r.nilai_ujian !== "").length,
    [draft],
  );
  const rataDraft = useMemo(() => {
    const vals = draft.map((r) => hitung(r.nilai_tugas, r.nilai_ujian)).filter((v) => v !== null);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }, [draft]);

  const simpan = useMutation({
    mutationFn: (payload) => apiPost("/grades/batch", payload),
    onSuccess: (rows) => {
      qc.invalidateQueries({ queryKey: ["rapor"] });
      qc.invalidateQueries({ queryKey: ["lembar"] });
      qc.invalidateQueries({ queryKey: ["kelas"] });
      qc.invalidateQueries({ queryKey: ["tren"] });
      toast.success(`${rows.length} nilai tersimpan untuk ${rows[0]?.student_name ?? "siswa"}`);
      setOpen(false);
      onSaved?.();
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal menyimpan nilai"),
  });

  const siswaAktif = students.find((s) => s.id === studentId);
  const kkm = lembar.data?.kkm ?? 75;

  const terapkanIsiCepat = () => {
    const v = Number(isiCepat);
    if (!isiCepat || Number.isNaN(v)) {
      toast.error("Masukkan angka dulu, misal 80");
      return;
    }
    setDraft((prev) =>
      prev.map((r) =>
        r.nilai_tugas === "" && r.nilai_ujian === "" ? { ...r, nilai_tugas: v, nilai_ujian: v } : r,
      ),
    );
    toast.success(`Baris kosong diisi ${v} — silakan sesuaikan per mapel`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" data-testid="open-grade-dialog-button">
            <ClipboardList className="mr-2 h-4 w-4" /> Isi Rapor
          </Button>
        }
      />
      <DialogContent className="max-h-[92vh] w-full overflow-y-auto sm:max-w-[1020px]">
        <DialogHeader>
          <DialogTitle>Lembar Pengisian Rapor</DialogTitle>
          <DialogDescription>
            Semua mata pelajaran siswa sudah terdaftar di bawah. Cukup isi angka Tugas & Ujian —
            nilai akhir (40% tugas + 60% ujian) dan predikat dihitung otomatis. Tekan Tab untuk pindah kolom.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-56 flex-1 space-y-2">
            <Label htmlFor="lembar-siswa">Siswa</Label>
            <Select value={studentId} onValueChange={(v) => setStudentId(String(v))}>
              <SelectTrigger id="lembar-siswa" data-testid="grade-student-select">
                <SelectValue>
                  {(v) => students.find((s) => s.id === String(v))?.name || "Pilih siswa"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id} data-testid={`grade-student-option-${s.id}`}>
                    {s.name} · {s.kelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="isi-cepat">Isi cepat baris kosong</Label>
            <div className="flex gap-2">
              <Input
                id="isi-cepat"
                type="number"
                min={0}
                max={100}
                value={isiCepat}
                onChange={(e) => setIsiCepat(e.target.value)}
                placeholder="80"
                className="w-24"
                data-testid="isi-cepat-input"
              />
              <Button type="button" variant="outline" onClick={terapkanIsiCepat} data-testid="isi-cepat-button">
                <Wand2 className="mr-2 h-4 w-4" /> Terapkan
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-[#F8FAFC] p-3 text-sm">
          <Badge className="bg-[#1E3A8A] text-white" data-testid="lembar-progress">
            {terisi}/{draft.length} mapel terisi
          </Badge>
          <span className="text-[#64748B]">
            Rata-rata sementara: <strong className="font-mono" data-testid="lembar-rata-draft">{rataDraft}</strong>
          </span>
          <span className="text-[#64748B]">
            {siswaAktif ? `${siswaAktif.name} · ${siswaAktif.kelas}` : ""}
            {lembar.data?.jurusan ? ` · Jurusan ${lembar.data.jurusan}` : ""}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto" data-testid="lembar-table">
          {lembar.isPending && studentId ? (
            <p className="flex items-center gap-2 py-6 text-sm text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan daftar mata pelajaran...
            </p>
          ) : draft.length === 0 ? (
            <p className="py-6 text-sm text-[#64748B]" data-testid="lembar-empty-state">
              Pilih siswa terlebih dahulu untuk menampilkan daftar mata pelajaran.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-52">Mata Pelajaran</TableHead>
                  <TableHead className="w-28">Tugas</TableHead>
                  <TableHead className="w-28">Ujian</TableHead>
                  <TableHead className="w-24">Akhir</TableHead>
                  <TableHead className="w-20">Predikat</TableHead>
                  <TableHead>Catatan (opsional)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.map((row, idx) => {
                  const akhir = hitung(row.nilai_tugas, row.nilai_ujian);
                  const pred = predikatOf(akhir);
                  const merah = akhir !== null && akhir < kkm;
                  const slug = row.subject.replace(/\s/g, "-").toLowerCase();
                  return (
                    <TableRow key={row.subject} data-testid={`lembar-row-${slug}`}>
                      <TableCell className="font-medium">
                        {row.subject}
                        {row.terisi ? (
                          <span className="ml-2 text-xs text-[#64748B]">(tersimpan)</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={row.nilai_tugas}
                          onChange={(e) => set(idx, "nilai_tugas", e.target.value)}
                          className="w-20"
                          data-testid={`lembar-tugas-${slug}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={row.nilai_ujian}
                          onChange={(e) => set(idx, "nilai_ujian", e.target.value)}
                          className="w-20"
                          data-testid={`lembar-ujian-${slug}`}
                        />
                      </TableCell>
                      <TableCell
                        className={`font-mono font-semibold ${merah ? "text-[#B91C1C]" : "text-[#15803D]"}`}
                        data-testid={`lembar-akhir-${slug}`}
                      >
                        {akhir === null ? "—" : akhir}
                      </TableCell>
                      <TableCell>
                        {pred ? (
                          <Badge className={PREDIKAT_CLASS[pred]} data-testid={`lembar-predikat-${slug}`}>
                            {pred}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.catatan}
                          onChange={(e) => set(idx, "catatan", e.target.value)}
                          placeholder={merah ? "Disarankan remedial..." : "Catatan singkat..."}
                          data-testid={`lembar-catatan-${slug}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" data-testid="grade-cancel-button">Batal</Button>} />
          <Button
            disabled={simpan.isPending || terisi === 0}
            data-testid="grade-save-button"
            onClick={() =>
              simpan.mutate({
                student_id: studentId,
                semester: lembar.data?.semester || "",
                guru: user?.name || "Guru",
                guru_id: user?.id || "",
                items: draft
                  .filter((r) => r.nilai_tugas !== "" || r.nilai_ujian !== "")
                  .map((r) => ({
                    subject: r.subject,
                    nilai_tugas: r.nilai_tugas === "" ? null : Number(r.nilai_tugas),
                    nilai_ujian: r.nilai_ujian === "" ? null : Number(r.nilai_ujian),
                    catatan: r.catatan,
                  })),
              })
            }
          >
            {simpan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan {terisi} Nilai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
