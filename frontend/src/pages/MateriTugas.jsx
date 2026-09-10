import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Plus, Search, Upload } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function UnggahDialog({ tipe }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState({ title: "", subject: "", description: "", file_url: "", due_date: "" });

  const create = useMutation({
    mutationFn: (payload) => apiPost("/documents", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Dokumen berhasil ditambahkan");
      setForm({ title: "", subject: "", description: "", file_url: "", due_date: "" });
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal menambahkan dokumen"),
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" data-testid="open-upload-dialog-button">
            <Plus className="mr-2 h-4 w-4" /> Tambah
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah {tipe}</DialogTitle>
          <DialogDescription>Simpan tautan berkas (Google Drive, PDF, video) beserta detailnya.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="d-title">Judul</Label>
            <Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="document-title-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-subject">Mata Pelajaran</Label>
            <Input id="d-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="document-subject-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="d-url">Tautan Berkas</Label>
            <Input id="d-url" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} data-testid="document-url-input" />
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
                    created_by: user?.name || "Guru",
                  })
                }
              >
                Simpan
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

function DocCard({ doc, showSubmit }) {
  const subs = useQuery({
    queryKey: ["submissions", doc.id],
    queryFn: () => apiGet(`/documents/${doc.id}/submissions`),
    enabled: doc.type === "tugas",
  });
  const count = (subs.data ?? []).length;

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
          {showSubmit && doc.type === "tugas" ? <KumpulkanDialog doc={doc} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MateriTugas() {
  const [tab, setTab] = useState("materi");
  const [q, setQ] = useState("");
  const { data: user } = useCurrentUser();

  const docs = useQuery({
    queryKey: ["documents", tab, q],
    queryFn: () => apiGet(`/documents?type=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  });
  const list = docs.data ?? [];

  return (
    <AppShell
      title="Materi, Tugas & Dokumen"
      subtitle="Pusat sumber belajar dan arsip resmi Sekolah Citra Negara"
      action={user?.role !== "siswa" ? <UnggahDialog tipe={tab} /> : null}
    >
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
                  <DocCard key={d.id} doc={d} showSubmit={user?.role === "siswa"} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </AppShell>
  );
}
