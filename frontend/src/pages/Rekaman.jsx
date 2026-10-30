import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileAudio,
  ListChecks,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { tanggal } from "@/lib/format";

const BAHASA = [
  { value: "auto", label: "Deteksi otomatis" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
  { value: "jv", label: "Bahasa Jawa" },
  { value: "ar", label: "العربية (Arab)" },
  { value: "ja", label: "日本語 (Jepang)" },
];

const FORMAT = ".mp3,.m4a,.wav,.webm,.ogg,.oga,.flac,.mp4,.mpeg,.mpga,.aac,.amr,.3gp,.mov,.opus,.wma,.mkv";

const STATUS = {
  memproses: { label: "Memproses", cls: "bg-[#FEF3C7] text-[#B45309] border-transparent" },
  selesai: { label: "Selesai", cls: "bg-[#DCFCE7] text-[#15803D] border-transparent" },
  gagal: { label: "Gagal", cls: "bg-[#FEE2E2] text-[#B91C1C] border-transparent" },
};

const waktu = (detik) => {
  if (detik === null || detik === undefined) return "--:--";
  const total = Math.floor(detik);
  const j = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return j ? `${j}:${String(m).padStart(2, "0")}:${s}` : `${String(m).padStart(2, "0")}:${s}`;
};

const ukuran = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// fetch() tidak memberi progres unggah, jadi pakai XHR khusus di sini.
function unggahRekaman({ file, title, language }, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("language", language === "auto" ? "" : language);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/recordings");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body?.detail || `Unggah gagal (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Koneksi terputus saat mengunggah"));
    xhr.send(form);
  });
}

function salin(teks) {
  navigator.clipboard
    .writeText(teks)
    .then(() => toast.success("Disalin ke papan klip"))
    .catch(() => toast.error("Gagal menyalin"));
}

function KartuUnggah({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("auto");
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(0);

  const unggah = useMutation({
    mutationFn: () => unggahRekaman({ file, title, language }, setProgress),
    onSuccess: (rec) => {
      toast.success("Rekaman terunggah — AI sedang memproses");
      setFile(null);
      setTitle("");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded(rec);
    },
    onError: (e) => {
      setProgress(0);
      toast.error(e.message);
    },
  });

  const pilih = (f) => {
    if (!f) return;
    if (f.size > 200 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 200 MB");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <Card className="border-[#E2E8F0]">
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-[#1E3A8A]" />
          <h2 className="font-heading text-lg font-bold">Unggah Rekaman</h2>
        </div>
        <p className="mt-1 text-sm text-[#64748B]">
          Rapat guru, pelajaran di kelas, wawancara, atau catatan suara — AI akan membuat transkrip per klip dan
          ringkasannya.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pilih(e.dataTransfer.files?.[0]);
          }}
          data-testid="rekaman-dropzone"
          className={`mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-200 ${
            drag ? "border-[#1E3A8A] bg-[#EFF6FF]" : "border-[#CBD5E1] hover:border-[#1E3A8A] hover:bg-[#F8FAFC]"
          }`}
        >
          {file ? (
            <>
              <FileAudio className="h-8 w-8 text-[#1E3A8A]" />
              <p className="mt-2 max-w-full truncate text-sm font-semibold text-[#0F172A]" data-testid="rekaman-file-name">
                {file.name}
              </p>
              <p className="text-xs text-[#64748B]">{ukuran(file.size)} · klik untuk ganti</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-[#64748B]" />
              <p className="mt-2 text-sm font-semibold text-[#0F172A]">Seret file ke sini atau klik untuk memilih</p>
              <p className="text-xs text-[#64748B]">MP3, M4A, WAV, WEBM, OGG, MP4 · maks 200 MB</p>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={FORMAT}
          className="hidden"
          onChange={(e) => pilih(e.target.files?.[0])}
          data-testid="rekaman-file-input"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <Label htmlFor="rekaman-judul">Judul</Label>
            <Input
              id="rekaman-judul"
              className="mt-1.5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Rapat Wali Kelas Oktober"
              data-testid="rekaman-title-input"
            />
          </div>
          <div>
            <Label htmlFor="rekaman-bahasa">Bahasa rekaman</Label>
            <Select value={language} onValueChange={(v) => setLanguage(String(v))}>
              <SelectTrigger id="rekaman-bahasa" className="mt-1.5 w-full" data-testid="rekaman-language-select">
                <SelectValue>{(v) => BAHASA.find((b) => b.value === v)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BAHASA.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="mt-4 w-full"
          disabled={!file || unggah.isPending}
          onClick={() => unggah.mutate()}
          data-testid="rekaman-upload-button"
        >
          {unggah.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Mengunggah {progress}%
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Proses dengan AI
            </>
          )}
        </Button>
        {unggah.isPending ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div className="h-full bg-[#1E3A8A] transition-all" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DaftarRekaman({ items, selectedId, onSelect, isLoading }) {
  return (
    <Card className="border-[#E2E8F0]">
      <CardContent className="p-0">
        <div className="border-b border-[#E2E8F0] px-6 py-4">
          <h2 className="font-heading text-base font-bold">Rekaman Saya</h2>
        </div>
        <div className="max-h-[48vh] overflow-y-auto" data-testid="rekaman-list">
          {isLoading ? (
            <p className="px-6 py-6 text-sm text-[#64748B]">Memuat…</p>
          ) : items.length === 0 ? (
            <p className="px-6 py-6 text-sm text-[#64748B]">Belum ada rekaman. Unggah file pertama Anda di atas.</p>
          ) : (
            items.map((r) => {
              const st = STATUS[r.status] ?? STATUS.memproses;
              const aktif = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelect(r.id)}
                  data-testid={`rekaman-item-${r.id}`}
                  className={`flex w-full items-start gap-3 border-b border-[#F1F5F9] px-6 py-3.5 text-left transition-colors duration-200 last:border-b-0 ${
                    aktif ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  <FileAudio className={`mt-0.5 h-4 w-4 shrink-0 ${aktif ? "text-[#1E3A8A]" : "text-[#94A3B8]"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{r.title}</p>
                    <p className="truncate text-xs text-[#64748B]">
                      {tanggal(r.created_at)}
                      {r.duration ? ` · ${waktu(r.duration)}` : ""}
                      {r.jumlah_klip ? ` · ${r.jumlah_klip} klip` : ""}
                    </p>
                    {r.status === "memproses" ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[#B45309]">
                        <Loader2 className="h-3 w-3 animate-spin" /> {r.tahap}
                      </p>
                    ) : null}
                  </div>
                  <Badge className={st.cls}>{st.label}</Badge>
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Ringkasan({ rec, onRegenerate, regenerating }) {
  const s = rec.summary;
  if (!s) {
    return (
      <div className="rounded-xl border border-dashed border-[#CBD5E1] p-6 text-center" data-testid="rekaman-no-summary">
        <p className="text-sm text-[#64748B]">Ringkasan belum tersedia.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRegenerate} disabled={regenerating}>
          <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} /> Buat ringkasan
        </Button>
      </div>
    );
  }
  const teksSalin = [
    s.judul,
    s.ringkasan,
    s.poin_penting.length ? `Poin penting:\n${s.poin_penting.map((p) => `- ${p}`).join("\n")}` : "",
    s.tindak_lanjut.length ? `Tindak lanjut:\n${s.tindak_lanjut.map((p) => `- ${p}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <div className="space-y-5" data-testid="rekaman-summary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {s.judul ? <h3 className="font-heading text-lg font-bold text-[#0F172A]">{s.judul}</h3> : null}
          {s.topik.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.topik.map((t) => (
                <Badge key={t} className="border-transparent bg-[#F1F5F9] text-[#334155]">
                  #{t}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => salin(teksSalin)} data-testid="rekaman-copy-summary">
            <Copy className="h-4 w-4" /> Salin
          </Button>
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating} title="Buat ulang ringkasan">
            <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#0F172A]">{s.ringkasan}</p>

      {s.poin_penting.length ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <Sparkles className="h-4 w-4 text-[#F59E0B]" /> Poin penting
          </p>
          <ul className="mt-2 space-y-1.5">
            {s.poin_penting.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#334155]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E3A8A]" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {s.tindak_lanjut.length ? (
        <div className="rounded-xl bg-[#F0FDF4] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#15803D]">
            <ListChecks className="h-4 w-4" /> Tindak lanjut
          </p>
          <ul className="mt-2 space-y-1.5">
            {s.tindak_lanjut.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#14532D]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DaftarKlip({ clips, currentTime, onPlay }) {
  const [cari, setCari] = useState("");
  const q = cari.trim().toLowerCase();
  const tampil = q ? clips.filter((c) => c.text.toLowerCase().includes(q)) : clips;
  const aktifIdx = clips.findIndex((c) => c.start !== null && currentTime >= c.start && currentTime < c.end);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <Input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari kata dalam transkrip…"
          className="pl-9"
          data-testid="rekaman-clip-search"
        />
      </div>
      <p className="mt-2 text-xs text-[#64748B]">
        {q ? `${tampil.length} dari ${clips.length} klip cocok` : `${clips.length} klip`}
      </p>
      <div className="mt-3 max-h-[52vh] space-y-2 overflow-y-auto pr-1" data-testid="rekaman-clips">
        {tampil.map((c) => {
          const aktif = c.idx === aktifIdx;
          return (
            <div
              key={c.idx}
              data-testid={`rekaman-clip-${c.idx}`}
              className={`group flex gap-3 rounded-xl border p-3 transition-colors duration-200 ${
                aktif ? "border-[#1E3A8A] bg-[#EFF6FF]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"
              }`}
            >
              <button
                type="button"
                onClick={() => c.start !== null && onPlay(c.start)}
                disabled={c.start === null}
                className="flex h-fit shrink-0 items-center gap-1 rounded-lg bg-[#F1F5F9] px-2 py-1 font-mono text-xs font-semibold text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white disabled:cursor-default disabled:opacity-60 disabled:hover:bg-[#F1F5F9] disabled:hover:text-[#1E3A8A]"
                title="Putar dari sini"
              >
                <Play className="h-3 w-3" /> {waktu(c.start)}
              </button>
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#0F172A]">{c.text}</p>
              <button
                type="button"
                onClick={() => salin(c.text)}
                className="h-fit shrink-0 rounded-md p-1 text-[#94A3B8] opacity-0 transition-opacity hover:text-[#1E3A8A] group-hover:opacity-100 focus:opacity-100"
                title="Salin klip"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRekaman({ id, onDeleted }) {
  const qc = useQueryClient();
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [tab, setTab] = useState("ringkasan");

  const detail = useQuery({
    queryKey: ["recording", id],
    queryFn: () => apiGet(`/recordings/${id}`),
    refetchInterval: (q) => (q.state.data?.status === "memproses" ? 3000 : false),
  });
  const rec = detail.data;

  // Detail di-poll lebih sering daripada daftar — sinkronkan badge daftar begitu selesai.
  useEffect(() => {
    if (rec?.status && rec.status !== "memproses") qc.invalidateQueries({ queryKey: ["recordings"] });
  }, [rec?.status, qc]);

  const regen = useMutation({
    mutationFn: () => apiPost(`/recordings/${id}/ringkasan`),
    onSuccess: (data) => {
      qc.setQueryData(["recording", id], data);
      toast.success("Ringkasan diperbarui");
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal membuat ringkasan"),
  });

  const hapus = useMutation({
    mutationFn: () => apiDelete(`/recordings/${id}`),
    onSuccess: () => {
      toast.success("Rekaman dihapus");
      qc.invalidateQueries({ queryKey: ["recordings"] });
      onDeleted();
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal menghapus"),
  });

  const putar = (detik) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = detik;
    a.play().catch(() => {});
  };

  if (detail.isLoading) {
    return <p className="p-6 text-sm text-[#64748B]">Memuat rekaman…</p>;
  }
  if (!rec) {
    return <p className="p-6 text-sm text-[#B91C1C]">Rekaman tidak dapat dimuat.</p>;
  }
  const st = STATUS[rec.status] ?? STATUS.memproses;

  return (
    <div className="space-y-5 p-6" data-testid="rekaman-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-heading text-xl font-bold text-[#0F172A]" data-testid="rekaman-detail-title">
              {rec.title}
            </h2>
            <Badge className={st.cls} data-testid="rekaman-detail-status">
              {st.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            {rec.filename} · {ukuran(rec.size_bytes)}
            {rec.duration ? ` · ${waktu(rec.duration)}` : ""} · {tanggal(rec.created_at)}
            {rec.owner_name ? ` · ${rec.owner_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rec.status === "selesai" ? (
            <>
              <a href={`/api/recordings/${id}/export?format=txt`} data-testid="rekaman-export-txt">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" /> TXT
                </Button>
              </a>
              <a href={`/api/recordings/${id}/export?format=srt`} data-testid="rekaman-export-srt">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" /> SRT
                </Button>
              </a>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
            disabled={hapus.isPending || rec.status === "memproses"}
            onClick={() => window.confirm(`Hapus rekaman "${rec.title}"?`) && hapus.mutate()}
            data-testid="rekaman-delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <audio
        ref={audioRef}
        controls
        preload="metadata"
        src={`/api/recordings/${id}/audio`}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        className="w-full"
        data-testid="rekaman-audio"
      />

      {rec.status === "memproses" ? (
        <div className="flex items-center gap-3 rounded-xl bg-[#FFFBEB] p-4" data-testid="rekaman-processing">
          <Loader2 className="h-5 w-5 animate-spin text-[#B45309]" />
          <div>
            <p className="text-sm font-semibold text-[#92400E]">{rec.tahap}…</p>
            <p className="text-xs text-[#B45309]">
              Rekaman 10 menit biasanya selesai dalam ±1 menit. Halaman ini akan diperbarui otomatis.
            </p>
          </div>
        </div>
      ) : null}

      {rec.error ? (
        <div className="flex items-start gap-3 rounded-xl bg-[#FEF2F2] p-4" data-testid="rekaman-error">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" />
          <p className="text-sm text-[#991B1B]">{rec.error}</p>
        </div>
      ) : null}

      {rec.clips.length ? (
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList data-testid="rekaman-tabs">
            <TabsTrigger value="ringkasan" data-testid="tab-ringkasan">
              Ringkasan
            </TabsTrigger>
            <TabsTrigger value="klip" data-testid="tab-klip">
              Klip Transkrip ({rec.clips.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ringkasan" className="pt-3">
            <Ringkasan rec={rec} onRegenerate={() => regen.mutate()} regenerating={regen.isPending} />
          </TabsContent>
          <TabsContent value="klip" className="pt-3">
            <DaftarKlip clips={rec.clips} currentTime={currentTime} onPlay={putar} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

export default function Rekaman() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");

  const list = useQuery({
    queryKey: ["recordings"],
    queryFn: () => apiGet("/recordings"),
    refetchInterval: (q) => (q.state.data?.some((r) => r.status === "memproses") ? 4000 : false),
  });
  const items = useMemo(() => list.data ?? [], [list.data]);

  // Saat sebuah rekaman selesai diproses, segarkan juga detailnya.
  const statusSebelumnya = useRef({});
  useEffect(() => {
    for (const r of items) {
      if (statusSebelumnya.current[r.id] === "memproses" && r.status !== "memproses") {
        qc.invalidateQueries({ queryKey: ["recording", r.id] });
        if (r.status === "selesai") toast.success(`"${r.title}" selesai diproses`);
      }
      statusSebelumnya.current[r.id] = r.status;
    }
  }, [items, qc]);

  const pilih = (id) => setParams(id ? { id } : {});

  return (
    <AppShell title="Rekaman AI" subtitle="Unggah rekaman → klip transkrip & ringkasan otomatis">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <KartuUnggah
            onUploaded={(rec) => {
              qc.invalidateQueries({ queryKey: ["recordings"] });
              pilih(rec.id);
            }}
          />
          <DaftarRekaman items={items} selectedId={selectedId} onSelect={pilih} isLoading={list.isLoading} />
        </div>

        <Card className="border-[#E2E8F0] lg:col-span-8">
          <CardContent className="p-0">
            {selectedId ? (
              <DetailRekaman key={selectedId} id={selectedId} onDeleted={() => pilih(null)} />
            ) : (
              <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1E3A8A]">
                  <Mic className="h-7 w-7" />
                </div>
                <p className="mt-4 font-heading text-lg font-bold">Ubah rekaman jadi catatan</p>
                <p className="mt-1 max-w-md text-sm text-[#64748B]">
                  Unggah file rekaman, lalu dapatkan transkrip yang terbagi per klip berstempel waktu (klik untuk
                  memutar bagian itu) beserta ringkasan, poin penting, dan tindak lanjut.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
