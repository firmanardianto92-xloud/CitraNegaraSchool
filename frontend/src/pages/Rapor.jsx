import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import TrenNilai from "@/components/TrenNilai";
import CatatanWaliList from "@/components/CatatanWali";
import LembarRaporDialog from "@/components/LembarRaporDialog";

const PREDIKAT_CLASS = {
  A: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  B: "bg-[#EFF6FF] text-[#1D4ED8] border-transparent",
  C: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  D: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
  E: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
};

export default function Rapor() {
  const { data: user } = useCurrentUser();
  const isSiswa = user?.role === "siswa";
  const isGuru = user?.role === "guru";

  // Guru hanya boleh melihat & mengisi siswa yang dia ampu; admin melihat semua.
  const students = useQuery({
    queryKey: ["users", "siswa", isGuru ? user?.id : "semua"],
    queryFn: () =>
      apiGet(isGuru ? `/users?role=siswa&homeroom_teacher_id=${user.id}` : "/users?role=siswa"),
    enabled: Boolean(user) && !isSiswa,
  });
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
      action={!isSiswa ? <LembarRaporDialog students={studentList} defaultStudentId={studentId} /> : null}
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

      <div className="mt-6">
        <TrenNilai studentId={studentId} />
      </div>

      <div className="mt-6">
        <CatatanWaliList studentId={studentId} studentName={data?.student_name ?? "siswa"} canWrite={!isSiswa} />
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
