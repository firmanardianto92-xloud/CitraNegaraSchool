import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowUpRight, Award, CalendarClock, CheckCircle2, FileText, GraduationCap, Users2, Wallet,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { STATUS_CLASS, STATUS_LABEL, rupiah, tanggal } from "@/lib/format";

export default function Dashboard() {
  const { data: user } = useCurrentUser();
  const isSiswa = user?.role === "siswa";
  const isGuru = user?.role === "guru";

  const tugas = useQuery({
    queryKey: ["documents", "tugas", user?.id, isSiswa],
    queryFn: () => apiGet(`/documents?type=tugas${isSiswa && user?.id ? `&student_id=${user.id}` : ""}`),
  });
  // Guru tidak pernah melihat data keuangan — query tagihan hanya untuk siswa & admin.
  const invoices = useQuery({
    queryKey: ["invoices", "dashboard", user?.id],
    queryFn: () => apiGet(`/payments/invoices${isSiswa && user?.id ? `?payer_ref=${user.id}` : ""}`),
    enabled: Boolean(user) && !isGuru,
  });
  const ppdb = useQuery({
    queryKey: ["ppdb", "all"],
    queryFn: () => apiGet("/ppdb/registrations"),
    enabled: Boolean(user) && !isGuru,
  });
  const sesi = useQuery({
    queryKey: ["mentoring", "dashboard", user?.id],
    queryFn: () => apiGet(`/mentoring/sessions${isSiswa && user?.id ? `?student_id=${user.id}` : ""}`),
  });
  const rapor = useQuery({
    queryKey: ["rapor", user?.id],
    queryFn: () => apiGet(`/grades/rapor/${user.id}`),
    enabled: Boolean(isSiswa && user?.id),
  });
  const kelas = useQuery({
    queryKey: ["kelas", user?.id],
    queryFn: () => apiGet(`/grades/kelas/${user.id}`),
    enabled: Boolean(isGuru && user?.id),
  });

  const tugasList = tugas.data ?? [];
  const invoiceList = invoices.data ?? [];
  const belumLunas = invoiceList.filter((i) => i.status !== "lunas");
  const totalTagihan = belumLunas.reduce((sum, i) => sum + i.amount, 0);
  const kelasData = kelas.data;

  const stats = isGuru
    ? [
        { label: "Siswa Diampu", value: kelasData?.jumlah_siswa ?? 0, icon: Users2, testid: "stat-siswa" },
        { label: "Rata-rata Kelas", value: kelasData?.rata_rata_kelas ?? 0, icon: Award, testid: "stat-rata-kelas" },
        { label: "Siswa Nilai Merah", value: kelasData?.siswa_bermasalah ?? 0, icon: AlertTriangle, testid: "stat-merah" },
        { label: "Tugas Dipublikasikan", value: tugasList.length, icon: FileText, testid: "stat-tugas" },
      ]
    : [
        { label: "Tugas Aktif", value: tugasList.length, icon: FileText, testid: "stat-tugas" },
        { label: "Tagihan Belum Lunas", value: rupiah(totalTagihan), icon: Wallet, testid: "stat-tagihan" },
        isSiswa
          ? { label: "Rata-rata Rapor", value: rapor.data?.rata_rata ?? 0, icon: Award, testid: "stat-rapor" }
          : { label: "Pendaftar PPDB", value: (ppdb.data ?? []).length, icon: GraduationCap, testid: "stat-ppdb" },
        { label: "Sesi Mentoring", value: (sesi.data ?? []).length, icon: CalendarClock, testid: "stat-mentoring" },
      ];

  const perluPerhatian = (kelasData?.students ?? []).filter((s) => s.jumlah_merah > 0).slice(0, 5);

  return (
    <AppShell
      title={`Halo, ${user?.name ?? "Tamu"}`}
      subtitle={
        user
          ? `${user.role.toUpperCase()} · ${user.kelas ?? "Citra Negara"}${user.level ? ` · ${user.level.toUpperCase()}${user.jurusan ? ` ${user.jurusan}` : ""}` : ""}`
          : "Masuk untuk melihat data pribadi"
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, testid }) => (
          <Card key={label} className="citra-lift border-[#E2E8F0]" data-testid={testid}>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E3A8A]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">{label}</p>
                <p className="mt-1 truncate font-heading text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Card className="border-[#E2E8F0] lg:col-span-7">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold">
                {isSiswa ? "Tugas dari Guru Anda" : "Tugas & Tenggat Terdekat"}
              </h2>
              <Link to="/materi-tugas" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1D4ED8]" data-testid="dashboard-materi-link">
                Lihat semua <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 space-y-3" data-testid="dashboard-tugas-list">
              {tugasList.length === 0 ? (
                <p className="text-sm text-[#64748B]">Belum ada tugas untuk ditampilkan.</p>
              ) : (
                tugasList.slice(0, 4).map((t) => (
                  <div key={t.id} className="citra-lift rounded-xl border border-[#E2E8F0] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{t.title}</p>
                      <Badge className="bg-[#EFF6FF] text-[#1D4ED8]">{t.subject}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#64748B]">Tenggat: {tanggal(t.due_date)} · {t.created_by}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-5">
          {isGuru ? (
            <Card className="border-[#E2E8F0]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold">Siswa Perlu Perhatian</h2>
                  <Link to="/kelas-saya" className="text-sm font-semibold text-[#1D4ED8]" data-testid="dashboard-kelas-link">
                    Kelas Saya
                  </Link>
                </div>
                <div className="mt-5 space-y-3" data-testid="dashboard-perlu-perhatian">
                  {perluPerhatian.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-[#15803D]">
                      <CheckCircle2 className="h-4 w-4" /> Semua siswa tuntas di atas KKM.
                    </p>
                  ) : (
                    perluPerhatian.map((s) => (
                      <div key={s.student_id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{s.student_name}</p>
                          <p className="font-mono text-xs text-[#64748B]">Rata-rata {s.rata_rata}</p>
                        </div>
                        <Badge className="bg-[#FEE2E2] text-[#B91C1C]">{s.jumlah_merah} merah</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#E2E8F0]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold">Tagihan Sekolah</h2>
                  <Link to="/pembayaran" className="text-sm font-semibold text-[#1D4ED8]" data-testid="dashboard-pembayaran-link">
                    Bayar
                  </Link>
                </div>
                <div className="mt-5 space-y-3" data-testid="dashboard-invoice-list">
                  {invoiceList.slice(0, 4).map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{i.fee_name}</p>
                        <p className="font-mono text-xs text-[#64748B]">{rupiah(i.amount)}</p>
                      </div>
                      <Badge className={STATUS_CLASS[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                    </div>
                  ))}
                  {invoiceList.length === 0 ? <p className="text-sm text-[#64748B]">Belum ada tagihan.</p> : null}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none bg-[linear-gradient(135deg,#0A192F,#1E3A8A)]">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">CitraBot AI</p>
              <h3 className="mt-2 font-heading text-xl font-bold text-white">
                {isGuru ? "Bantu susun rencana pembelajaran" : "Butuh bantuan belajar?"}
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                {isGuru
                  ? "Minta ide soal, rubrik penilaian, atau program remedial untuk siswa dengan nilai merah."
                  : "Tanya ringkasan materi, syarat PPDB, atau jadwal belajar efektif langsung ke asisten AI sekolah."}
              </p>
              <Link to="/ai-assistant" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0A192F]" data-testid="dashboard-ai-link">
                Buka CitraBot <ArrowUpRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
