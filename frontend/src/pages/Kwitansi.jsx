import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { rupiah, tanggal } from "@/lib/format";

export default function Kwitansi() {
  const { invoiceId } = useParams();
  const receipt = useQuery({
    queryKey: ["receipt", invoiceId],
    queryFn: () => apiGet(`/payments/invoices/${invoiceId}/receipt`),
    retry: false,
  });
  const r = receipt.data;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Link to="/pembayaran" data-testid="kwitansi-back-link">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
          </Link>
          <Button size="sm" onClick={() => window.print()} data-testid="kwitansi-print-button">
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
        </div>

        <Card className="border-[#E2E8F0]" data-testid="kwitansi-card">
          <CardContent className="p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A192F] font-bold text-[#F59E0B]">CN</div>
                <div>
                  <p className="font-heading text-lg font-bold">Sekolah Citra Negara</p>
                  <p className="text-xs text-[#64748B]">Jl. Raya Citra No. 1, Depok</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Kwitansi</p>
                <p className="font-mono text-sm font-bold" data-testid="kwitansi-nomor">{r?.receipt_no ?? "—"}</p>
              </div>
            </div>

            {receipt.isError ? (
              <p className="mt-6 text-sm text-[#B45309]" data-testid="kwitansi-error">
                Kwitansi belum tersedia. Kwitansi hanya diterbitkan untuk tagihan yang sudah lunas.
              </p>
            ) : (
              <>
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-[#DCFCE7] p-4 text-[#15803D]">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="text-sm font-semibold" data-testid="kwitansi-status">Pembayaran diterima — LUNAS</p>
                </div>

                <dl className="mt-6 space-y-4">
                  {[
                    ["Diterima dari", r?.payer_name],
                    ["Jenjang", r?.level_name],
                    ["Untuk pembayaran", r?.fee_name],
                    ["No. Invoice", r?.invoice_no],
                    ["Tanggal bayar", tanggal(r?.paid_at)],
                    ["Metode", r?.metode],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-dashed border-[#E2E8F0] pb-3">
                      <dt className="text-sm text-[#64748B]">{k}</dt>
                      <dd className="text-right text-sm font-medium">{v || "—"}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 flex items-center justify-between rounded-xl bg-[#0A192F] p-5">
                  <p className="text-sm text-slate-300">Jumlah dibayar</p>
                  <p className="font-heading text-2xl font-bold text-white" data-testid="kwitansi-jumlah">
                    {rupiah(r?.amount)}
                  </p>
                </div>

                <p className="mt-6 text-xs leading-relaxed text-[#64748B]">
                  Kwitansi ini diterbitkan otomatis oleh sistem LMS Citra Negara dan sah tanpa tanda tangan basah.
                  Simpan sebagai bukti pembayaran resmi.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
