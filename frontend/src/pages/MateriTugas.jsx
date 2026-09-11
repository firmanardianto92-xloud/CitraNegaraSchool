import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Plus, Search, Share2, Upload, Users2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { tanggal } from "@/lib/format";

const TABS = [
  { key: "materi", label: "Materi Pelajaran" },
  { key: "tugas", label: "Tugas & Ujian" },
  { key: "dokumen", label: "Dokumen Resmi" },
];

function PublishDialog({ tipe }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState({
    title: "", subject: "", description: "", file_url: "", due_date: "",
    target_level: "semua", target_jurusan: "semua",
  });
  const [siswaTerpilih, setSiswaTerpilih] = useState([]);

  const levels = useQuery({ queryKey: ["levels"], queryFn: () => apiGet("/admin/levels") });
  const levelList = levels.data ?? [];
  const jurusanOptions = levelList.find((l) => l.code === form.target_level)?.jurusan ?? [];

  const siswa = useQuery({
    queryKey: ["users", "siswa", form.target_level, form.target_jurusan],
    queryFn: () =>
      apiGet(
        `/users?role=siswa${form.target_level !== "semua" ? `&level=${form.target_level}` : ""}` +
          `${form.target_jurusan !== "semua" ? `&jurusan=${encodeURIComponent(form.target_jurusan)}` : ""}`,
      ),
  });
  const siswaList = siswa.data ?? [];

  const create = useMutation({
    mutationFn: (payload) => apiPost("/documents", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Materi berhasil dipublikasikan ke siswa terkait");
      setForm({ title: "", subject: "", description: "", file_url: "", due_date: "", target_level: "semua", target_jurusan: "semua" });
      setSiswaTerpilih([]);
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal mempublikasikan materi"),
  });

  const toggleSiswa = (id) =>
    setSiswaTerpilih((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" data-testid="open-upload-dialog-button">
            <Plus className="mr-2 h-4 w-4" /> Publikasikan
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Publikasikan {tipe}</DialogTitle>
          <DialogDescription>
            Pilih target jenjang/jurusan, atau tandai siswa tertentu agar hanya mereka yang menerima.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="d-title">Judul</Label>
            <Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="document-title-input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="d-subject">Mata Pelajaran</Label>
              <Input id="d-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="document-subject-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-url">Tautan Berkas</Label>
              <Input id="d-url" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} data-testid="document-url-input" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="d-level">Jenjang Tujuan</Label>
              <Select
                value={form.target_level}
                onValueChange={(v) => setForm({ ...form, target_level: String(v), target_jurusan: "semua" })}
              >
                <SelectTrigger id="d-level" data-testid="document-level-select">
                  <SelectValue>{(v) => (v === "semua" ? "Semua jenjang" : String(v).toUpperCase())}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua" data-testid="document-level-option-semua">Semua jenjang</SelectItem>
                  {levelList.map((l) => (
                    <SelectItem key={l.code} value={l.code} data-testid={`document-level-option-${l.code}`}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-jurusan">Jurusan</Label>
              <Select value={form.target_jurusan} onValueChange={(v) => setForm({ ...form, target_jurusan: String(v) })}>
                <SelectTrigger id="d-jurusan" data-testid="document-jurusan-select">
                  <SelectValue>{(v) => (v === "semua" ? "Semua jurusan" : String(v))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua" data-testid="document-jurusan-option-semua">Semua jurusan</SelectItem>
                  {jurusanOptions.map((j) => (
                    <SelectItem key={j} value={j} data-testid={`document-jurusan-option-${j.toLowerCase()}`}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {tipe === "tugas" ? (
            <div className="space-y-2">
              <Label htmlFor="d-due">Tenggat</Label>
              <Input id="d-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="document-due-input" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="d-desc">Deskripsi</Label>
            <Textarea id="d-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="document-description-input" />
          </div>
          <div className="rounded-xl border border-[#E2E8F0] p-4">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-[#1E3A8A]" />
              <p className="text-sm font-semibold">Pilih Siswa Tertentu (opsional)</p>
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              Kosongkan untuk mengirim ke semua siswa pada jenjang/jurusan di atas.
            </p>
            <div className="mt-3 max-h-40 space-y-2 overflow-y-auto" data-testid="student-picker">
              {siswaList.map((s) => (
                <label key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-[#F1F5F9]">
                  <Checkbox
                    checked={siswaTerpilih.includes(s.id)}
                    onCheckedChange={() => toggleSiswa(s.id)}
                    data-testid={`student-checkbox-${s.id}`}
                  />
                  <span>
                    {s.name} <span className="text-xs text-[#64748B]">· {s.kelas}</span>
                  </span>
                </label>
              ))}
              {siswaList.length === 0 ? <p className="text-xs text-[#64748B]">Tidak ada siswa pada filter ini.</p> : null}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" data-testid="document-cancel-button">Batal</Button>} />
          <DialogClose
            render={
              <Button
                data-testid="document-save-button"
                onClick={() =>
                  create.mutate({
                    ...form,
                    type: tipe,
                    due_date: form.due_date || null,
                    target_level: form.target_level === "semua" ? null : form.target_level,
                    target_jurusan: form.target_jurusan === "semua" ? null : form.target_jurusan,
                    target_student_ids: siswaTerpilih,
                    created_by: user?.name || "Guru",
                    created_by_id: user?.id || "",
                  })
                }
              >
                Publikasikan
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SocialDialog({ doc }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [caption, setCaption] = useState(
    `Hasil pengajaran: ${doc.title} bersama siswa Citra Negara. #CitraNegara #${doc.subject.replace(/\s/g, "")}`,
  );
  const [platform, setPlatform] = useState("instagram");
  const [imageUrl, setImageUrl] = useState("");

  const ajukan = useMutation({
    mutationFn: (payload) => apiPost("/social/posts", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social"] });
      toast.success("Pengajuan dikirim ke admin untuk direview");
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal mengirim pengajuan"),
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" data-testid={`social-request-button-${doc.id}`}>
            <Share2 className="mr-2 h-4 w-4" /> Ajukan Sosmed
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajukan publikasi sosial media</DialogTitle>
          <DialogDescription>
            Pengajuan akan direview admin/humas sebelum dipublikasikan sebagai hasil pengajaran.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sp-platform">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(String(v))}>
              <SelectTrigger id="sp-platform" data-testid="social-platform-select">
                <SelectValue>{(v) => (String(v) === "instagram" ? "Instagram" : "Facebook")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram" data-testid="social-platform-option-instagram">Instagram</SelectItem>
                <SelectItem value="facebook" data-testid="social-platform-option-facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp-image">Tautan Foto Kegiatan</Label>
            <Input id="sp-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." data-testid="social-image-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp-caption">Caption</Label>
            <Textarea id="sp-caption" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} data-testid="social-caption-input" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                data-testid="social-submit-button"
                onClick={() =>
                  ajukan.mutate({
                    document_id: doc.id,
                    judul: doc.title,
                    caption,
                    image_url: imageUrl,
                    platform,
                    diajukan_oleh: user?.name || "Guru",
                    diajukan_oleh_id: user?.id || "",
                  })
                }
              >
                Kirim Pengajuan
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KumpulkanDialog({ doc }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [fileUrl, setFileUrl] = useState("");
  const [note, setNote] = useState("");

  const submit = useMutation({
    mutationFn: (payload) => apiPost(`/documents/${doc.id}/submissions`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions", doc.id] });
      toast.success("Tugas berhasil dikumpulkan");
      setFileUrl("");
      setNote("");
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal mengumpulkan tugas"),
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" data-testid={`submit-tugas-button-${doc.id}`}>
            <Upload className="mr-2 h-4 w-4" /> Kumpulkan
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kumpulkan: {doc.title}</DialogTitle>
          <DialogDescription>Masukkan tautan hasil pekerjaan Anda.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="s-url">Tautan Berkas</Label>
            <Input id="s-url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." data-testid="submission-url-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-note">Catatan</Label>
            <Textarea id="s-note" value={note} onChange={(e) => setNote(e.target.value)} data-testid="submission-note-input" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                data-testid="submission-save-button"
                onClick={() =>
                  submit.mutate({
                    student_id: user?.id || "u-siswa-1",
                    student_name: user?.name || "Siswa Demo",
                    file_url: fileUrl,
                    note,
                  })
                }
              >
                Kirim
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocCard({ doc, role, canPublish }) {
  const subs = useQuery({
    queryKey: ["submissions", doc.id],
    queryFn: () => apiGet(`/documents/${doc.id}/submissions`),
    enabled: doc.type === "tugas",
  });
  const count = (subs.data ?? []).length;
  const target =
    doc.target_student_ids?.length > 0
      ? `${doc.target_student_ids.length} siswa terpilih`
      : `${doc.target_level ? doc.target_level.toUpperCase() : "Semua jenjang"}${doc.target_jurusan ? ` · ${doc.target_jurusan}` : ""}`;

  return (
    <Card className="citra-lift border-[#E2E8F0]" data-testid={`document-card-${doc.id}`}>
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E3A8A]">
            <FileText className="h-5 w-5" />
          </div>
          <Badge className="bg-[#F1F5F9] text-[#475569]">{doc.subject}</Badge>
        </div>
        <h3 className="mt-4 font-heading text-base font-semibold leading-snug">{doc.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-[#64748B]">{doc.description}</p>
        <p className="mt-3 text-xs text-[#64748B]">
          {doc.type === "tugas" ? `Tenggat ${tanggal(doc.due_date)} · ` : ""}
          {doc.created_by}
        </p>
        <p className="mt-1 text-xs font-medium text-[#B45309]" data-testid={`document-target-${doc.id}`}>
          Target: {target}
        </p>
        {doc.type === "tugas" ? (
          <p className="mt-1 text-xs font-medium text-[#1D4ED8]" data-testid={`submission-count-${doc.id}`}>
            {count} pengumpulan
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 pt-2">
          <a href={doc.file_url || "#"} target="_blank" rel="noreferrer" data-testid={`download-button-${doc.id}`}>
            <Button size="sm" variant="ghost">
              <Download className="mr-2 h-4 w-4" /> Buka
            </Button>
          </a>
          {role === "siswa" && doc.type === "tugas" ? <KumpulkanDialog doc={doc} /> : null}
          {role === "guru" && canPublish ? <SocialDialog doc={doc} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MateriTugas() {
  const [tab, setTab] = useState("materi");
  const [q, setQ] = useState("");
  const { data: user } = useCurrentUser();
  const isSiswa = user?.role === "siswa";

  const docs = useQuery({
    queryKey: ["documents", tab, q, user?.id, isSiswa],
    queryFn: () =>
      apiGet(
        `/documents?type=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}` +
          `${isSiswa && user?.id ? `&student_id=${user.id}` : ""}`,
      ),
  });
  const list = docs.data ?? [];
  const canPublish = user?.role === "admin" || (user?.role === "guru" && user?.can_publish);

  return (
    <AppShell
      title="Materi, Tugas & Dokumen"
      subtitle={
        isSiswa
          ? "Materi dan tugas dari guru yang ditujukan untuk Anda"
          : "Publikasikan materi ke jenjang, jurusan, atau siswa tertentu"
      }
      action={canPublish ? <PublishDialog tipe={tab} /> : null}
    >
      {user?.role === "guru" && !user?.can_publish ? (
        <div className="mb-6 rounded-xl border border-[#FEF3C7] bg-[#FEF3C7] p-4 text-sm text-[#92400E]" data-testid="publish-permission-warning">
          Anda belum diberi izin publikasi materi oleh admin. Hubungi admin sekolah untuk mengaktifkannya.
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul dokumen..."
            className="pl-9"
            data-testid="document-search-input"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList data-testid="document-tabs">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} data-testid={`tab-${t.key}`}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-6">
            {docs.isError ? (
              <p className="text-sm text-[#B45309]">Data dokumen belum bisa dimuat. Coba muat ulang halaman.</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-[#64748B]" data-testid="document-empty-state">Belum ada dokumen pada kategori ini.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="document-grid">
                {list.map((d) => (
                  <DocCard key={d.id} doc={d} role={user?.role} canPublish={canPublish} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}
