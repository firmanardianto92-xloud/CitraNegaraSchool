import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronDown, Search, Users2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";

const PREDIKAT_CLASS = {
  A: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  B: "bg-[#EFF6FF] text-[#1D4ED8] border-transparent",
  C: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  D: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
  E: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
};

function StudentRow({ row, kkm }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow data-testid={`kelas-row-${row.student_id}`}>
        <TableCell className="font-medium">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-left transition-colors duration-150 hover:text-[#1D4ED8]"
            data-testid={`kelas-expand-${row.student_id}`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`} />
            {row.student_name}
          </button>
        </TableCell>
        <TableCell className="text-sm text-[#64748B]">{row.kelas}</TableCell>
        <TableCell className="font-mono font-semibold" data-testid={`kelas-rata-${row.student_id}`}>
          {row.rata_rata}
        </TableCell>
        <TableCell>
          <Badge className={PREDIKAT_CLASS[row.predikat] ?? PREDIKAT_CLASS.C}>{row.predikat}</Badge>
        </TableCell>
        <TableCell className="font-mono">{row.jumlah_mapel}</TableCell>
        <TableCell>
          {row.jumlah_merah > 0 ? (
            <Badge className="bg-[#FEE2E2] text-[#B91C1C]" data-testid={`kelas-merah-${row.student_id}`}>
              {row.jumlah_merah} nilai merah
            </Badge>
          ) : (
            <Badge className="bg-[#DCFCE7] text-[#15803D]" data-testid={`kelas-tuntas-${row.student_id}`}>
              Tuntas semua
            </Badge>
          )}
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow data-testid={`kelas-detail-${row.student_id}`}>
          <TableCell colSpan={6} className="bg-[#F8FAFC]">
            <div className="grid gap-2 py-2 sm:grid-cols-2 lg:grid-cols-3">
              {row.grades.map((g) => {
                const merah = g.nilai_akhir < kkm;
                return (
                  <div
                    key={g.id}
                    className={`rounded-xl border p-3 ${merah ? "border-[#FCA5A5] bg-[#FEF2F2]" : "border-[#E2E8F0] bg-white"}`}
                    data-testid={`kelas-mapel-${row.student_id}-${g.subject.replace(/\s/g, "-").toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{g.subject}</p>
                      <p className={`font-mono text-sm font-bold ${merah ? "text-[#B91C1C]" : "text-[#15803D]"}`}>
                        {g.nilai_akhir}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Tugas {g.nilai_tugas} · Ujian {g.nilai_ujian} · {g.predikat}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">{g.catatan}</p>
                  </div>
                );
              })}
              {row.grades.length === 0 ? <p className="text-sm text-[#64748B]">Belum ada nilai.</p> : null}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export default function KelasSaya() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [teacherId, setTeacherId] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("semua");

  const teachers = useQuery({
    queryKey: ["teachers"],
    queryFn: () => apiGet("/admin/teachers"),
    enabled: isAdmin,
  });
  const teacherList = teachers.data ?? [];
  const activeTeacher = isAdmin ? teacherId || teacherList[0]?.id : user?.id;

  const kelas = useQuery({
    queryKey: ["kelas", activeTeacher],
    queryFn: () => apiGet(`/grades/kelas/${activeTeacher}`),
    enabled: Boolean(activeTeacher),
  });
  const data = kelas.data;
  const kkm = data?.kkm ?? 75;

  const rows = useMemo(() => {
    let list = data?.students ?? [];
    if (q) list = list.filter((s) => s.student_name.toLowerCase().includes(q.toLowerCase()));
    if (filter === "merah") list = list.filter((s) => s.jumlah_merah > 0);
    if (filter === "tuntas") list = list.filter((s) => s.jumlah_merah === 0);
    return list;
  }, [data, q, filter]);

  return (
    <AppShell
      title="Kelas Saya"
      subtitle={
        data
          ? `${data.teacher_name} · ${data.kelas || "Wali kelas"}${data.jurusan ? ` · Jurusan ${data.jurusan}` : ""} · KKM ${kkm}`
          : "Rekap nilai siswa yang Anda ampu"
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-none bg-[linear-gradient(135deg,#0A192F,#1E3A8A)]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">Siswa Diampu</p>
            <p className="mt-2 font-heading text-3xl font-bold text-white" data-testid="kelas-jumlah-siswa">
              {data?.jumlah_siswa ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="citra-lift border-[#E2E8F0]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Rata-rata Kelas</p>
            <p className="mt-2 font-heading text-3xl font-bold" data-testid="kelas-rata-kelas">
              {data?.rata_rata_kelas ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="citra-lift border-[#E2E8F0]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Perlu Perhatian</p>
            <p className="mt-2 flex items-center gap-2 font-heading text-3xl font-bold text-[#B91C1C]" data-testid="kelas-bermasalah">
              <AlertTriangle className="h-6 w-6" /> {data?.siswa_bermasalah ?? 0}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">siswa punya nilai di bawah KKM</p>
          </CardContent>
        </Card>
        <Card className="citra-lift border-[#E2E8F0]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tuntas Semua</p>
            <p className="mt-2 flex items-center gap-2 font-heading text-3xl font-bold text-[#15803D]" data-testid="kelas-tuntas-total">
              <CheckCircle2 className="h-6 w-6" /> {(data?.jumlah_siswa ?? 0) - (data?.siswa_bermasalah ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-[#E2E8F0]">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-[#1E3A8A]" />
              <h2 className="font-heading text-lg font-bold">Daftar Siswa & Nilai</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin ? (
                <Select value={activeTeacher || ""} onValueChange={(v) => setTeacherId(String(v))}>
                  <SelectTrigger className="w-56" data-testid="kelas-teacher-select">
                    <SelectValue>
                      {(v) => teacherList.find((t) => t.id === String(v))?.name || "Pilih guru"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {teacherList.map((t) => (
                      <SelectItem key={t.id} value={t.id} data-testid={`kelas-teacher-option-${t.id}`}>
                        {t.name} · {t.kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama siswa..."
                  className="w-56 pl-9"
                  data-testid="kelas-search-input"
                />
              </div>
              <div className="flex gap-2">
                {[
                  ["semua", "Semua"],
                  ["merah", "Nilai Merah"],
                  ["tuntas", "Tuntas"],
                ].map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={filter === key ? "default" : "outline"}
                    onClick={() => setFilter(key)}
                    data-testid={`kelas-filter-${key}`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-[#64748B]">
            Klik nama siswa untuk melihat rincian nilai per mata pelajaran. Nilai di bawah KKM {kkm} ditandai merah.
          </p>

          <div className="mt-5" data-testid="kelas-table">
            {rows.length === 0 ? (
              <p className="text-sm text-[#64748B]" data-testid="kelas-empty-state">
                {data?.jumlah_siswa === 0
                  ? "Belum ada siswa yang terdaftar pada kelas Anda."
                  : "Tidak ada siswa yang cocok dengan filter ini."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Rata-rata</TableHead>
                    <TableHead>Predikat</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Status Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <StudentRow key={r.student_id} row={r} kkm={kkm} />
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
