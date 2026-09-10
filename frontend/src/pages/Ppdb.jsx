import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { STATUS_CLASS, STATUS_LABEL, rupiah, tanggal } from "@/lib/format";

const PROGRAM = ["Rekayasa Perangkat Lunak", "IPA", "IPS", "Multimedia", "Akuntansi"];
const LANGKAH = [
  "Isi biodata & pilih program",
  "Unggah berkas (KK, Ijazah, Rapor)",
  "Bayar biaya pendaftaran & booking kursi",
  "Tes pemetaan & verifikasi berkas",
  "Pengumuman kelulusan PPDB",
];
const BIAYA_AWAL = [
  { nama: "Biaya Formulir & Pendaftaran PPDB", jumlah: 250000 },
  { nama: "Biaya Booking Kursi / Uang Pangkal Awal", jumlah: 1500000 },
];

export default function Ppdb() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState({
    nama_lengkap: "", nisn: "", asal_sekolah: "", program: PROGRAM[0],
    email: "", telepon: "", alamat: "", berkas_url: "",
  });

  const regs = useQuery({ queryKey: ["ppdb", "list"], queryFn: () => apiGet("/ppdb/registrations") });

  const daftar = useMutation({
    mutationFn: (payload) => apiPost("/ppdb/registrations", payload),
    onSuccess: (reg) => {
      qc.invalidateQueries({ queryKey: ["ppdb"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Pendaftaran terkirim. Nomor: ${reg.nomor_pendaftaran}`);
      setForm({ nama_lengkap: "", nisn: "", asal_sekolah: "", program: PROGRAM[0], email: "", telepon: "", alamat: "", berkas_url: "" });
    },
    onError: (e) => toast.error(e?.body?.detail?.[0]?.msg || e?.body?.detail || "Gagal mengirim pendaftaran"),
  });

  const ubahStatus = useMutation({
    mutationFn: ({ id, status }) => apiPatch(`/ppdb/registrations/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ppdb"] });
      toast.success("Status pendaftaran diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui status"),
  });

  const list = regs.data ?? [];

  return (
    <AppShell title="PPDB 2026" subtitle="Penerimaan Peserta Didik Baru Sekolah Citra Negara">
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-[#E2E8F0] lg:col-span-7">
          <CardContent className="p-6">
            <h2 className="font-heading text-lg font-bold">Formulir Pendaftaran</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Setelah dikirim, tagihan biaya pendaftaran dan booking kursi otomatis dibuat di halaman Pembayaran.
            </p>
            <form
              className="mt-6 grid gap-4 sm:grid-cols-2"
              data-testid="ppdb-form"
              onSubmit={(e) => {
                e.preventDefault();
                daftar.mutate(form);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="p-nama">Nama Lengkap</Label>
                <Input id="p-nama" required value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} data-testid="ppdb-nama-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-nisn">NISN</Label>
                <Input id="p-nisn" required value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} data-testid="ppdb-nisn-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-asal">Asal Sekolah</Label>
                <Input id="p-asal" required value={form.asal_sekolah} onChange={(e) => setForm({ ...form, asal_sekolah: e.target.value })} data-testid="ppdb-asal-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-program">Program / Jurusan</Label>
                <Select value={form.program} onValueChange={(v) => setForm({ ...form, program: String(v) })}>
                  <SelectTrigger id="p-program" data-testid="ppdb-program-select">
                    <SelectValue>{(v) => v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAM.map((p) => (
                      <SelectItem key={p} value={p} data-testid={`ppdb-program-option-${p.split(" ")[0].toLowerCase()}`}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="ppdb-email-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-telepon">Nomor Telepon</Label>
                <Input id="p-telepon" required value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} data-testid="ppdb-telepon-input" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-berkas">Tautan Berkas (KK, Ijazah, Rapor)</Label>
                <Input id="p-berkas" value={form.berkas_url} onChange={(e) => setForm({ ...form, berkas_url: e.target.value })} placeholder="https://drive.google.com/..." data-testid="ppdb-berkas-input" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-alamat">Alamat</Label>
                <Textarea id="p-alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} data-testid="ppdb-alamat-input" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={daftar.isPending} data-testid="ppdb-submit-button">
                  {daftar.isPending ? "Mengirim..." : "Kirim Pendaftaran"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-5">
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-6">
              <h2 className="font-heading text-lg font-bold">Alur Pendaftaran</h2>
              <ol className="mt-4 space-y-3" data-testid="ppdb-steps">
                {LANGKAH.map((l, i) => (
                  <li key={l} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-bold text-white">{i + 1}</span>
                    <span className="text-sm text-[#334155]">{l}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-[#E2E8F0]">
            <CardContent className="p-6">
              <h2 className="font-heading text-lg font-bold">Biaya Awal PPDB</h2>
              <div className="mt-4 space-y-3">
                {BIAYA_AWAL.map((b) => (
                  <div key={b.nama} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] p-4">
                    <p className="text-sm">{b.nama}</p>
                    <p className="font-mono text-sm font-semibold">{rupiah(b.jumlah)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 border-[#E2E8F0]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#1E3A8A]" />
            <h2 className="font-heading text-lg font-bold">Daftar Pendaftar</h2>
          </div>
          <div className="mt-5 space-y-3" data-testid="ppdb-registration-list">
            {list.length === 0 ? (
              <p className="text-sm text-[#64748B]">Belum ada pendaftar.</p>
            ) : (
              list.map((r) => (
                <div key={r.id} className="citra-lift rounded-xl border border-[#E2E8F0] p-4" data-testid={`ppdb-row-${r.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.nama_lengkap}</p>
                      <p className="font-mono text-xs text-[#64748B]">
                        {r.nomor_pendaftaran} · NISN {r.nisn} · {r.program}
                      </p>
                      <p className="text-xs text-[#64748B]">{r.asal_sekolah} · {tanggal(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_CLASS[r.status]} data-testid={`ppdb-status-${r.id}`}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                      {isAdmin && r.status !== "diterima" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`ppdb-verify-button-${r.id}`}
                          onClick={() =>
                            ubahStatus.mutate({
                              id: r.id,
                              status: r.status === "menunggu_verifikasi" ? "diverifikasi" : "diterima",
                            })
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {r.status === "menunggu_verifikasi" ? "Verifikasi" : "Terima"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
