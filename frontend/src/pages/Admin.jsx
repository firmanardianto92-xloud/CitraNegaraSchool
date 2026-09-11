import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Megaphone, Settings2, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPatch, apiPut } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { STATUS_CLASS, rupiah } from "@/lib/format";

const FEE_ORDER = [
  ["registrasi", "Biaya Registrasi"],
  ["booking", "Biaya Booking Kursi"],
  ["spp", "SPP Bulanan"],
  ["seragam", "Seragam & Buku"],
];

const SOCIAL_STATUS_CLASS = {
  diajukan: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  disetujui: "bg-[#EFF6FF] text-[#1D4ED8] border-transparent",
  terpublikasi: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  ditolak: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
};

function LevelCard({ level }) {
  const qc = useQueryClient();
  const [fees, setFees] = useState(level.fees);
  const [jurusan, setJurusan] = useState((level.jurusan ?? []).join(", "));

  const simpan = useMutation({
    mutationFn: () =>
      apiPut(`/admin/levels/${level.code}`, {
        fees: Object.fromEntries(Object.entries(fees).map(([k, v]) => [k, Number(v) || 0])),
        jurusan: jurusan.split(",").map((j) => j.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["levels"] });
      qc.invalidateQueries({ queryKey: ["fees"] });
      toast.success(`Tarif ${level.name} tersimpan`);
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal menyimpan tarif"),
  });

  const totalAwal = (Number(fees.registrasi) || 0) + (Number(fees.booking) || 0);

  return (
    <Card className="border-[#E2E8F0]" data-testid={`level-card-${level.code}`}>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-base font-bold">{level.name}</h3>
            <p className="text-xs uppercase tracking-wider text-[#64748B]">{level.code}</p>
          </div>
          <Badge className="bg-[#EFF6FF] text-[#1D4ED8]" data-testid={`level-total-${level.code}`}>
            Biaya awal: {rupiah(totalAwal)}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEE_ORDER.map(([code, label]) => (
            <div key={code} className="space-y-2">
              <Label htmlFor={`${level.code}-${code}`}>{label}</Label>
              <Input
                id={`${level.code}-${code}`}
                type="number"
                value={fees[code] ?? 0}
                onChange={(e) => setFees({ ...fees, [code]: e.target.value })}
                data-testid={`fee-input-${level.code}-${code}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor={`${level.code}-jurusan`}>Jurusan (pisahkan dengan koma)</Label>
          <Input
            id={`${level.code}-jurusan`}
            value={jurusan}
            onChange={(e) => setJurusan(e.target.value)}
            placeholder="IPA, IPS, RPL"
            data-testid={`jurusan-input-${level.code}`}
          />
        </div>

        {level.sample_note ? (
          <p className="mt-4 rounded-xl bg-[#F1F5F9] p-3 text-xs text-[#475569]" data-testid={`level-sample-${level.code}`}>
            {level.sample_note}
          </p>
        ) : null}

        <Button size="sm" className="mt-4" onClick={() => simpan.mutate()} data-testid={`save-level-button-${level.code}`}>
          Simpan Konfigurasi
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [tab, setTab] = useState("jenjang");

  const levels = useQuery({ queryKey: ["levels"], queryFn: () => apiGet("/admin/levels") });
  const teachers = useQuery({ queryKey: ["teachers"], queryFn: () => apiGet("/admin/teachers") });
  const posts = useQuery({ queryKey: ["social", "all"], queryFn: () => apiGet("/social/posts") });

  const setIzin = useMutation({
    mutationFn: ({ id, can_publish }) => apiPatch(`/admin/teachers/${id}/publish-permission`, { can_publish }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ["teachers"] });
      toast.success(`Izin publikasi ${u.name}: ${u.can_publish ? "aktif" : "nonaktif"}`);
    },
    onError: () => toast.error("Gagal mengubah izin publikasi"),
  });

  const review = useMutation({
    mutationFn: ({ id, status }) =>
      apiPatch(`/social/posts/${id}`, { status, direview_oleh: user?.name || "Admin", catatan_review: "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social"] });
      toast.success("Status pengajuan diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui pengajuan"),
  });

  if (user && user.role !== "admin") {
    return (
      <AppShell title="Konfigurasi Sekolah" subtitle="Halaman khusus admin">
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-8 text-center" data-testid="admin-forbidden">
            <ShieldCheck className="mx-auto h-8 w-8 text-[#B45309]" />
            <p className="mt-3 font-semibold">Akses terbatas</p>
            <p className="mt-1 text-sm text-[#64748B]">Hanya admin sekolah yang dapat membuka halaman konfigurasi.</p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const levelList = levels.data ?? [];
  const teacherList = teachers.data ?? [];
  const postList = posts.data ?? [];

  return (
    <AppShell title="Konfigurasi Sekolah" subtitle="Jenjang & tarif biaya, izin publikasi guru, review sosial media">
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList data-testid="admin-tabs">
          <TabsTrigger value="jenjang" data-testid="admin-tab-jenjang">
            <GraduationCap className="mr-2 h-4 w-4" /> Jenjang & Biaya
          </TabsTrigger>
          <TabsTrigger value="guru" data-testid="admin-tab-guru">
            <Settings2 className="mr-2 h-4 w-4" /> Izin Publikasi Guru
          </TabsTrigger>
          <TabsTrigger value="sosmed" data-testid="admin-tab-sosmed">
            <Megaphone className="mr-2 h-4 w-4" /> Review Sosial Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jenjang" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2" data-testid="level-config-grid">
            {levelList.map((l) => (
              <LevelCard key={l.code} level={l} />
            ))}
            {levelList.length === 0 ? <p className="text-sm text-[#64748B]">Konfigurasi jenjang belum dapat dimuat.</p> : null}
          </div>
        </TabsContent>

        <TabsContent value="guru" className="mt-6">
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-6">
              <h2 className="font-heading text-lg font-bold">Guru yang boleh publikasi materi & sosial media</h2>
              <div className="mt-5 space-y-3" data-testid="teacher-permission-list">
                {teacherList.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] p-4">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-sm text-[#64748B]">{t.kelas} · {t.email}</p>
                    </div>
                    <label className="flex items-center gap-3 text-sm">
                      <Checkbox
                        checked={t.can_publish}
                        onCheckedChange={(v) => setIzin.mutate({ id: t.id, can_publish: Boolean(v) })}
                        data-testid={`publish-permission-checkbox-${t.id}`}
                      />
                      <span data-testid={`publish-permission-label-${t.id}`}>
                        {t.can_publish ? "Diizinkan" : "Belum diizinkan"}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sosmed" className="mt-6">
          <div className="space-y-4" data-testid="social-review-list">
            {postList.length === 0 ? (
              <p className="text-sm text-[#64748B]" data-testid="social-empty-state">Belum ada pengajuan publikasi.</p>
            ) : (
              postList.map((p) => (
                <Card key={p.id} className="border-[#E2E8F0]" data-testid={`social-post-${p.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{p.judul}</p>
                        <p className="text-sm text-[#64748B]">
                          {p.platform === "instagram" ? "Instagram" : "Facebook"} · diajukan {p.diajukan_oleh}
                        </p>
                      </div>
                      <Badge className={SOCIAL_STATUS_CLASS[p.status]} data-testid={`social-status-${p.id}`}>
                        {p.status}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.judul} className="h-32 w-full rounded-xl object-cover sm:w-40" />
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-xl bg-[#F1F5F9] text-xs text-[#64748B]">
                          Tanpa foto
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334155]" data-testid={`social-caption-${p.id}`}>
                        {p.caption}
                      </p>
                    </div>
                    {p.status === "diajukan" ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => review.mutate({ id: p.id, status: "terpublikasi" })} data-testid={`social-approve-button-${p.id}`}>
                          Setujui & Publikasikan
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => review.mutate({ id: p.id, status: "ditolak" })} data-testid={`social-reject-button-${p.id}`}>
                          Tolak
                        </Button>
                      </div>
                    ) : p.catatan_review ? (
                      <p className="mt-3 rounded-xl bg-[#F1F5F9] p-3 text-sm text-[#475569]">
                        Catatan review: {p.catatan_review} ({p.direview_oleh})
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="mt-6 border-[#E2E8F0]">
        <CardContent className="p-6">
          <h2 className="font-heading text-base font-bold">Contoh Tarif per Jenjang</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="level-sample-grid">
            {levelList.map((l) => (
              <div key={l.code} className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-sm font-semibold">{l.name}</p>
                <p className="mt-2 font-mono text-xs text-[#475569]">Registrasi {rupiah(l.fees?.registrasi)}</p>
                <p className="font-mono text-xs text-[#475569]">Booking {rupiah(l.fees?.booking)}</p>
                <p className="font-mono text-xs text-[#475569]">SPP {rupiah(l.fees?.spp)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(l.jurusan ?? []).length === 0 ? (
                    <Badge className={STATUS_CLASS.diverifikasi}>Tanpa jurusan</Badge>
                  ) : (
                    (l.jurusan ?? []).map((j) => (
                      <Badge key={j} className="bg-[#F1F5F9] text-[#475569]">{j}</Badge>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
