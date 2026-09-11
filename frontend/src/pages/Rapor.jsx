import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, BookOpen, Plus } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";

const PREDIKAT_CLASS = {
  A: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  B: "bg-[#EFF6FF] text-[#1D4ED8] border-transparent",
  C: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  D: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
  E: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
};

function InputNilaiDialog({ students, defaultStudentId }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState({
    student_id: defaultStudentId || "",
    subject: "",
    nilai_tugas: "",
    nilai_ujian: "",
    catatan: "",
  });

  const simpan = useMutation({
    mutationFn: (payload) => apiPost("/grades", payload),
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: ["rapor"] });
      qc.invalidateQueries({ queryKey: ["grades"] });
      toast.success(`Nilai ${g.subject} tersimpan — akhir ${g.nilai_akhir} (${g.predikat})`);
      setForm({ student_id: form.student_id, subject: "", nilai_tugas: "", nilai_ujian: "", catatan: "" });
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal menyimpan nilai"),
  });

  const namaSiswa = students.find((s) => s.id === form.student_id)?.name || "";

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" data-testid="open-grade-dialog-button">
            <Plus className="mr-2 h-4 w-4" /> Input Nilai
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Input Nilai Rapor</DialogTitle>
          <DialogDescription>Nilai akhir dihitung otomatis: 40% tugas + 60% ujian.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="g-siswa">Siswa</Label>
            <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: String(v) })}>
              <SelectTrigger id="g-siswa" data-testid="grade-student-select">
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
            <Label htmlFor="g-subject">Mata Pelajaran</Label>
            <Input id="g-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="grade-subject-input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="g-tugas">Nilai Tugas</Label>
              <Input id="g-tugas" type="number" value={form.nilai_tugas} onChange={(e) => setForm({ ...form, nilai_tugas: e.target.value })} data-testid="grade-tugas-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-ujian">Nilai Ujian</Label>
              <Input id="g-ujian" type="number" value={form.nilai_ujian} onChange={(e) => setForm({ ...form, nilai_ujian: e.target.value })} data-testid="grade-ujian-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-catatan">Catatan Guru</Label>
            <Textarea id="g-catatan" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} data-testid="grade-catatan-input" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" data-testid="grade-cancel-button">Batal</Button>} />
          <DialogClose
            render={
              <Button
                data-testid="grade-save-button"
                onClick={() =>
                  simpan.mutate({
                    student_id: form.student_id,
                    student_name: namaSiswa,
                    subject: form.subject,
                    nilai_tugas: Number(form.nilai_tugas) || 0,
                    nilai_ujian: Number(form.nilai_ujian) || 0,
                    catatan: form.catatan,
                    guru: user?.name || "Guru",
                  })
                }
              >
                Simpan Nilai
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Rapor() {
  const { data: user } = useCurrentUser();
  const isSiswa = user?.role === "siswa";

  const students = useQuery({ queryKey: ["users", "siswa"], queryFn: () => apiGet("/users?role=siswa") });
  const studentList = students.data ?? [];
  const [selected, setSelected] = useState("");
  const studentId = isSiswa ? user?.id : selected || studentList[0]?.id;

  const rapor = useQuery({
    queryKey: ["rapor", studentId],
    queryFn: () => apiGet(`/grades/rapor/${studentId}`),
    enabled: Boolean(studentId),
  });
  const data = rapor.data;
  const grades = data?.grades ?? [];

  return (
    <AppShell
      title="Rapor Nilai Siswa"
      subtitle={
        isSiswa
          ? `Nilai ${user?.name} · ${user?.kelas ?? ""} · dapat dilihat siswa & orang tua`
          : "Input dan pantau nilai per mata pelajaran"
      }
      action={!isSiswa ? <InputNilaiDialog students={studentList} defaultStudentId={studentId} /> : null}
    >
      {!isSiswa ? (
        <div className="mb-6 max-w-sm">
          <Label htmlFor="pilih-siswa">Pilih Siswa</Label>
          <Select value={studentId || ""} onValueChange={(v) => setSelected(String(v))}>
            <SelectTrigger id="pilih-siswa" className="mt-2" data-testid="rapor-student-select">
              <SelectValue>
                {(v) => studentList.find((s) => s.id === String(v))?.name || "Pilih siswa"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {studentList.map((s) => (
                <SelectItem key={s.id} value={s.id} data-testid={`rapor-student-option-${s.id}`}>
                  {s.name} · {s.kelas}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none bg-[linear-gradient(135deg,#0A192F,#1E3A8A)]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">Rata-rata Nilai</p>
            <p className="mt-2 font-heading text-4xl font-bold text-white" data-testid="rapor-rata-rata">
              {data?.rata_rata ?? 0}
            </p>
            <p className="mt-3 text-sm text-slate-300" data-testid="rapor-predikat">
              Predikat {data?.predikat ?? "-"} · {data?.jumlah_mapel ?? 0} mata pelajaran
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0] lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#1E3A8A]" />
              <h2 className="font-heading text-lg font-bold">{data?.student_name ?? "Siswa"}</h2>
            </div>
            <p className="mt-1 text-sm text-[#64748B]">{data?.semester ?? "Semester 1 - 2025/2026"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {grades.map((g) => (
                <Badge key={g.id} className={PREDIKAT_CLASS[g.predikat]}>
                  {g.subject}: {g.nilai_akhir}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-[#E2E8F0]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#1E3A8A]" />
            <h2 className="font-heading text-lg font-bold">Rincian Nilai per Mata Pelajaran</h2>
          </div>
          <div className="mt-5" data-testid="rapor-table">
            {grades.length === 0 ? (
              <p className="text-sm text-[#64748B]" data-testid="rapor-empty-state">
                Belum ada nilai yang diinput untuk siswa ini.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Nilai Tugas</TableHead>
                    <TableHead>Nilai Ujian</TableHead>
                    <TableHead>Nilai Akhir</TableHead>
                    <TableHead>Predikat</TableHead>
                    <TableHead>Catatan Guru</TableHead>
                    <TableHead>Guru</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((g) => (
                    <TableRow key={g.id} data-testid={`rapor-row-${g.id}`}>
                      <TableCell className="font-medium">{g.subject}</TableCell>
                      <TableCell className="font-mono">{g.nilai_tugas}</TableCell>
                      <TableCell className="font-mono">{g.nilai_ujian}</TableCell>
                      <TableCell className="font-mono font-semibold" data-testid={`rapor-akhir-${g.id}`}>{g.nilai_akhir}</TableCell>
                      <TableCell>
                        <Badge className={PREDIKAT_CLASS[g.predikat]} data-testid={`rapor-predikat-${g.id}`}>{g.predikat}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-[#64748B]">{g.catatan}</TableCell>
                      <TableCell className="text-sm">{g.guru}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
