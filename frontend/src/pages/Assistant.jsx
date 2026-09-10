import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Send, Sparkles, User } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api";

const QUICK = [
  "Jelaskan ringkasan materi Hukum Newton Fisika",
  "Apa saja syarat dokumen pendaftaran PPDB 2026?",
  "Bagaimana cara mengajukan keringanan biaya SPP?",
  "Buatkan jadwal belajar efektif untuk persiapan ujian",
];

export default function Assistant() {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const sessionId = useMemo(() => {
    const key = "citrabot_session";
    let sid = window.localStorage.getItem(key);
    if (!sid) {
      sid = `sesi-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(key, sid);
    }
    return sid;
  }, []);

  const history = useQuery({
    queryKey: ["chat", sessionId],
    queryFn: () => apiGet(`/chat/history/${sessionId}`),
  });

  const kirim = useMutation({
    mutationFn: (message) => apiPost("/chat", { session_id: sessionId, message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", sessionId] }),
    onError: (e) => toast.error(e?.body?.detail || "CitraBot sedang tidak tersedia"),
  });

  const messages = history.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, kirim.isPending]);

  const send = (text) => {
    const value = (text ?? input).trim();
    if (!value || kirim.isPending) return;
    setInput("");
    kirim.mutate(value);
  };

  return (
    <AppShell title="CitraBot AI" subtitle="Asisten akademik & layanan Sekolah Citra Negara">
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-[#E2E8F0] lg:col-span-8">
          <CardContent className="flex h-[62vh] flex-col p-0">
            <div className="flex-1 space-y-4 overflow-y-auto p-6" data-testid="chat-messages">
              {messages.length === 0 && !kirim.isPending ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1E3A8A]">
                    <Bot className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-heading text-lg font-bold">Halo, saya CitraBot</p>
                  <p className="mt-1 max-w-sm text-sm text-[#64748B]">
                    Tanyakan materi pelajaran, alur PPDB 2026, rincian biaya sekolah, atau tips belajar.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`citra-rise flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`chat-message-${m.role}`}
                  >
                    {m.role === "assistant" ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1E3A8A]">
                        <Bot className="h-4 w-4" />
                      </div>
                    ) : null}
                    <div
                      className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === "user" ? "bg-[#1E3A8A] text-white" : "bg-[#F1F5F9] text-[#0F172A]"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === "user" ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1E3A8A] text-white">
                        <User className="h-4 w-4" />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              {kirim.isPending ? (
                <div className="citra-typing flex items-center gap-2 text-sm text-[#64748B]" data-testid="chat-loading">
                  <Bot className="h-4 w-4" /> CitraBot sedang mengetik
                  <span>.</span><span style={{ animationDelay: "0.2s" }}>.</span><span style={{ animationDelay: "0.4s" }}>.</span>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <form
              className="flex items-center gap-2 border-t border-[#E2E8F0] p-4"
              data-testid="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tulis pertanyaan Anda..."
                data-testid="ai-chat-input"
              />
              <Button type="submit" disabled={kirim.isPending} data-testid="ai-chat-send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] lg:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F59E0B]" />
              <h2 className="font-heading text-lg font-bold">Pertanyaan Cepat</h2>
            </div>
            <div className="mt-4 space-y-2" data-testid="quick-prompts">
              {QUICK.map((p, idx) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  data-testid={`quick-prompt-${idx}`}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-left text-sm transition-colors duration-200 hover:border-[#1E3A8A] hover:bg-[#EFF6FF]"
                >
                  {p}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
