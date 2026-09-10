import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarClock, FileText, GraduationCap, Wallet } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { STATUS_CLASS, STATUS_LABEL, rupiah, tanggal } from "@/lib/format";

export default function Dashboard() {
  const { data: user } = useCurrentUser();
  const tugas = useQuery({ queryKey: ["documents", "tugas"], queryFn: () => apiGet("/documents?type=tugas") });
  const invoices = useQuery({ queryKey: ["invoices", "all"], queryFn: () => apiGet("/payments/invoices") });
  const ppdb = useQuery({ queryKey: ["ppdb", "all"], queryFn: () => apiGet("/ppdb/registrations") });
  const sesi = useQuery({ queryKey: ["mentoring", "all"], queryFn: () => apiGet("/mentoring/sessions") });

  const tugasList = tugas.data ?? [];
  const invoiceList = invoices.data ?? [];
  const belumLunas = invoiceList.filter((i) => i.status !== "lunas");
  const totalTagihan = belumLunas.reduce((sum, i) => sum + i.amount, 0);

  const stats = [
    { label: "Tugas Aktif", value: tugasList.length, icon: FileText, testid: "stat-tugas" },
    { label: "Tagihan Belum Lunas", value: rupiah(totalTagihan), icon: Wallet, testid: "stat-tagihan" },
    { label: "Pendaftar PPDB", value: (ppdb.data ?? []).length, icon: GraduationCap, testid: "stat-ppdb" },
    { label: "Sesi Mentoring", value: (sesi.data ?? []).length, icon: CalendarClock, testid: "stat-mentoring" },
  ];

  return (
    <AppShell
      title={`Halo, ${user?.name ?? "Tamu"}`}
      subtitle={user ? `${user.role.toUpperCase()} · ${user.kelas ?? "Citra Negara"}` : "Masuk untuk melihat data pribadi"}
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
              <h2 className="font-heading text-lg font-bold">Tugas & Tenggat Terdekat</h2>
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

          <Card className="border-none bg-[linear-gradient(135deg,#0A192F,#1E3A8A)]">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">CitraBot AI</p>
              <h3 className="mt-2 font-heading text-xl font-bold text-white">Butuh bantuan belajar?</h3>
              <p className="mt-2 text-sm text-slate-300">
                Tanya ringkasan materi, syarat PPDB, atau jadwal belajar efektif langsung ke asisten AI sekolah.
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
