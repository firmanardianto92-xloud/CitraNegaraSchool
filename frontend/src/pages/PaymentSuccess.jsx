import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ status: "checking", payment_status: "pending" });

  useEffect(() => {
    if (!sessionId) {
      setState({ status: "error", payment_status: "unknown" });
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const res = await apiGet(`/payments/status/${sessionId}`);
        if (cancelled) return;
        if (res.payment_status === "paid") {
          setState({ status: "paid", payment_status: "paid" });
          return;
        }
        setState({ status: "pending", payment_status: res.payment_status });
      } catch {
        if (cancelled) return;
        setState({ status: "error", payment_status: "unknown" });
        return;
      }
      if (attempts < 8) setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const paid = state.status === "paid";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5">
      <Card className="w-full max-w-md border-[#E2E8F0]" data-testid="payment-success-card">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#15803D]">
            {paid ? <CheckCircle2 className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold" data-testid="payment-success-title">
            {paid ? "Pembayaran Berhasil" : "Memverifikasi Pembayaran"}
          </h1>
          <p className="mt-2 text-sm text-[#64748B]" data-testid="payment-success-status">
            {paid
              ? "Terima kasih. Tagihan Anda sudah ditandai lunas di portal."
              : "Kami sedang memeriksa status transaksi ke Stripe. Mohon tunggu sebentar."}
          </p>
          {sessionId ? <p className="mt-3 break-all font-mono text-xs text-[#94A3B8]">{sessionId}</p> : null}
          <Link to="/pembayaran" className="mt-6 inline-block" data-testid="back-to-payments-link">
            <Button>Kembali ke Pembayaran</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
