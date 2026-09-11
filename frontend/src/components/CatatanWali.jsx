import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquareText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { tanggal } from "@/lib/format";

export function CatatanWaliDialog({ studentId, studentName, compact = false }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [isi, setIsi] = useState("");

  const simpan = useMutation({
    mutationFn: (payload) => apiPost("/notes", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Catatan wali kelas tersimpan — orang tua dapat membacanya");
      setIsi("");
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal menyimpan catatan"),
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size={compact ? "sm" : "default"} variant={compact ? "outline" : "default"} data-testid={`open-note-dialog-${studentId}`}>
            <Plus className="mr-2 h-4 w-4" /> Catatan Wali
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catatan Wali Kelas</DialogTitle>
          <DialogDescription>
            Tulis catatan perkembangan untuk {studentName}. Catatan ini dibaca siswa dan orang tua di halaman rapor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`note-${studentId}`}>Isi Catatan</Label>
          <Textarea
            id={`note-${studentId}`}
            rows={5}
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Contoh: Perkembangan belajar membaik, namun perlu pendampingan pada Matematika..."
            data-testid={`note-input-${studentId}`}
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" data-testid={`note-cancel-${studentId}`}>Batal</Button>} />
          <DialogClose
            render={
              <Button
                data-testid={`note-save-${studentId}`}
                onClick={() =>
                  simpan.mutate({
                    student_id: studentId,
                    isi,
                    semester: "Semester 1 - 2025/2026",
                    guru: user?.name || "Wali Kelas",
                    guru_id: user?.id || "",
                  })
                }
              >
                Simpan Catatan
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CatatanWaliList({ studentId, studentName, canWrite }) {
  const notes = useQuery({
    queryKey: ["notes", studentId],
    queryFn: () => apiGet(`/notes?student_id=${studentId}`),
    enabled: Boolean(studentId),
  });
  const list = notes.data ?? [];

  return (
    <Card className="border-[#E2E8F0]" data-testid="catatan-wali-card">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-[#1E3A8A]" />
            <h2 className="font-heading text-lg font-bold">Catatan Wali Kelas</h2>
          </div>
          {canWrite && studentId ? (
            <CatatanWaliDialog studentId={studentId} studentName={studentName} compact />
          ) : null}
        </div>

        <div className="mt-5 space-y-3" data-testid="catatan-wali-list">
          {list.length === 0 ? (
            <p className="text-sm text-[#64748B]" data-testid="catatan-empty-state">
              Belum ada catatan dari wali kelas.
            </p>
          ) : (
            list.map((n) => (
              <div key={n.id} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4" data-testid={`catatan-item-${n.id}`}>
                <p className="text-sm leading-relaxed text-[#334155]">{n.isi}</p>
                <p className="mt-2 text-xs text-[#64748B]">
                  {n.guru || "Wali Kelas"} · {n.semester || "-"} · {tanggal(n.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
