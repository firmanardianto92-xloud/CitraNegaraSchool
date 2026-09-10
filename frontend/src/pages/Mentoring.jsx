import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Video } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/format";

const KATEGORI = ["Akademik", "Karir", "Pribadi"];

function BookingDialog({ mentor }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [topik, setTopik] = useState("");
  const [kategori, setKategori] = useState(KATEGORI[0]);
  const [jadwal, setJadwal] = useState(mentor.slots?.[0] ?? "");

  const book = useMutation({
    mutationFn: (payload) => apiPost("/mentoring/sessions", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentoring"] });
      toast.success("Sesi mentoring berhasil dijadwalkan");
      setTopik("");
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal menjadwalkan sesi"),
  });

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" data-testid={`book-mentor-button-${mentor.id}`}>Jadwalkan Sesi</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mentoring bersama {mentor.name}</DialogTitle>
          <DialogDescription>{mentor.bidang}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="m-topik">Topik Konsultasi</Label>
            <Textarea id="m-topik" value={topik} onChange={(e) => setTopik(e.target.value)} data-testid="mentoring-topik-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-kategori">Kategori</Label>
            <Select value={kategori} onValueChange={(v) => setKategori(String(v))}>
              <SelectTrigger id="m-kategori" data-testid="mentoring-kategori-select">
                <SelectValue>{(v) => v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {KATEGORI.map((k) => (
                  <SelectItem key={k} value={k} data-testid={`mentoring-kategori-option-${k.toLowerCase()}`}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-jadwal">Pilih Slot Jadwal</Label>
            <Select value={jadwal} onValueChange={(v) => setJadwal(String(v))}>
              <SelectTrigger id="m-jadwal" data-testid="mentoring-jadwal-select">
                <SelectValue>{(v) => v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(mentor.slots ?? []).map((s) => (
                  <SelectItem key={s} value={s} data-testid={`mentoring-slot-${s.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" data-testid="mentoring-cancel-button">Batal</Button>} />
          <DialogClose
            render={
              <Button
                data-testid="mentoring-confirm-button"
                onClick={() =>
                  book.mutate({
                    mentor_id: mentor.id,
                    student_id: user?.id || "u-siswa-1",
                    student_name: user?.name || "Siswa Demo",
                    topik: topik || "Konsultasi umum",
                    kategori,
                    jadwal: jadwal || "Menyusul",
                  })
                }
              >
                Konfirmasi
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CatatanForm({ sesi }) {
  const qc = useQueryClient();
  const [catatan, setCatatan] = useState(sesi.catatan_mentor || "");
  const simpan = useMutation({
    mutationFn: () => apiPatch(`/mentoring/sessions/${sesi.id}`, { catatan_mentor: catatan, status: "selesai" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentoring"] });
      toast.success("Catatan mentor tersimpan");
    },
    onError: () => toast.error("Gagal menyimpan catatan"),
  });

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <Input
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        placeholder="Catatan tindak lanjut mentor..."
        data-testid={`mentoring-note-input-${sesi.id}`}
      />
      <Button size="sm" variant="outline" onClick={() => simpan.mutate()} data-testid={`mentoring-note-save-${sesi.id}`}>
        Simpan & Selesaikan
      </Button>
    </div>
  );
}

export default function Mentoring() {
  const { data: user } = useCurrentUser();
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: () => apiGet("/mentoring/mentors") });
  const sessions = useQuery({ queryKey: ["mentoring", "sessions"], queryFn: () => apiGet("/mentoring/sessions") });

  const mentorList = mentors.data ?? [];
  const sessionList = sessions.data ?? [];

  return (
    <AppShell title="Sistem Mentoring" subtitle="Bimbingan akademik, karir, dan konseling bersama guru Citra Negara">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="font-heading text-lg font-bold">Daftar Mentor</h2>
          <div className="mt-4 space-y-4" data-testid="mentor-list">
            {mentorList.map((m) => (
              <Card key={m.id} className="citra-lift border-[#E2E8F0]" data-testid={`mentor-card-${m.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1E3A8A] text-sm font-bold text-white">
                      {m.name.split(" ").slice(-2).map((w) => w[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-sm text-[#64748B]">{m.bidang}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(m.slots ?? []).map((s) => (
                          <Badge key={s} className="bg-[#F1F5F9] text-[#475569]">{s}</Badge>
                        ))}
                      </div>
                      <div className="mt-4">
                        <BookingDialog mentor={m} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {mentorList.length === 0 ? <p className="text-sm text-[#64748B]">Daftar mentor belum dapat dimuat.</p> : null}
          </div>
        </div>

        <div className="lg:col-span-7">
          <h2 className="font-heading text-lg font-bold">Riwayat & Jadwal Sesi</h2>
          <div className="mt-4 space-y-4" data-testid="mentoring-session-list">
            {sessionList.length === 0 ? (
              <p className="text-sm text-[#64748B]" data-testid="mentoring-empty-state">Belum ada sesi mentoring.</p>
            ) : (
              sessionList.map((s) => (
                <Card key={s.id} className="border-[#E2E8F0]" data-testid={`mentoring-session-${s.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{s.topik}</p>
                        <p className="text-sm text-[#64748B]">
                          {s.mentor_name} · {s.student_name} · {s.kategori}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-[#334155]">
                          <CalendarClock className="h-4 w-4" /> {s.jadwal}
                        </p>
                      </div>
                      <Badge className={STATUS_CLASS[s.status]} data-testid={`mentoring-status-${s.id}`}>
                        {STATUS_LABEL[s.status]}
                      </Badge>
                    </div>
                    {s.meeting_link ? (
                      <a href={s.meeting_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1D4ED8]" data-testid={`mentoring-link-${s.id}`}>
                        <Video className="h-4 w-4" /> Tautan pertemuan
                      </a>
                    ) : null}
                    {s.catatan_mentor ? (
                      <p className="mt-3 rounded-xl bg-[#F1F5F9] p-3 text-sm text-[#334155]" data-testid={`mentoring-note-${s.id}`}>
                        Catatan mentor: {s.catatan_mentor}
                      </p>
                    ) : null}
                    {user?.role !== "siswa" && s.status !== "selesai" ? <CatatanForm sesi={s} /> : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
