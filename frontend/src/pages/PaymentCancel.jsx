import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentCancel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5">
      <Card className="w-full max-w-md border-[#E2E8F0]" data-testid="payment-cancel-card">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#B91C1C]">
            <XCircle className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold">Pembayaran Dibatalkan</h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Transaksi belum diselesaikan. Anda dapat mengulangi pembayaran kapan saja dari halaman Pembayaran.
          </p>
          <Link to="/pembayaran" className="mt-6 inline-block" data-testid="cancel-back-link">
            <Button variant="outline">Kembali ke Pembayaran</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
