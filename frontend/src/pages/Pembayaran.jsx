import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, ReceiptText } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiGet, apiPost } from "@/lib/api";
import { STATUS_CLASS, STATUS_LABEL, rupiah, tanggal } from "@/lib/format";

export default function Pembayaran() {
  const qc = useQueryClient();
  const fees = useQuery({ queryKey: ["fees"], queryFn: () => apiGet("/payments/fees") });
  const invoices = useQuery({ queryKey: ["invoices", "page"], queryFn: () => apiGet("/payments/invoices") });

  const checkout = useMutation({
    mutationFn: (invoiceId) =>
      apiPost("/payments/checkout", { invoice_id: invoiceId, origin_url: window.location.origin }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Mengarahkan ke halaman pembayaran Stripe...");
      window.location.href = res.checkout_url;
    },
    onError: (e) => toast.error(e?.body?.detail || "Gagal membuat sesi pembayaran"),
  });

  const feeList = fees.data ?? [];
  const invoiceList = invoices.data ?? [];
  const totalBelum = invoiceList.filter((i) => i.status !== "lunas").reduce((s, i) => s + i.amount, 0);
  const totalLunas = invoiceList.filter((i) => i.status === "lunas").reduce((s, i) => s + i.amount, 0);

  return (
    <AppShell title="Biaya & Pembayaran" subtitle="Rincian biaya sekolah, tagihan, dan riwayat pembayaran">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none bg-[linear-gradient(135deg,#0A192F,#1E3A8A)] lg:col-span-1">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">Total Tagihan Aktif</p>
            <p className="mt-2 font-heading text-3xl font-bold text-white" data-testid="total-tagihan">{rupiah(totalBelum)}</p>
            <p className="mt-3 text-sm text-slate-300">Sudah dibayar: {rupiah(totalLunas)}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="font-heading text-lg font-bold">Daftar Jenis Biaya Sekolah</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="fee-catalog">
              {feeList.map((f) => (
                <div key={f.code} className="citra-lift rounded-xl border border-[#E2E8F0] p-4" data-testid={`fee-item-${f.code}`}>
                  <p className="text-sm font-semibold">{f.name}</p>
                  <p className="mt-1 font-mono text-sm text-[#1E3A8A]">{rupiah(f.amount)}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#64748B]">{f.description}</p>
                  <Badge className={f.mandatory ? "mt-3 bg-[#EFF6FF] text-[#1D4ED8]" : "mt-3 bg-[#F1F5F9] text-[#475569]"}>
                    {f.mandatory ? "Wajib" : "Opsional"}
                  </Badge>
                </div>
              ))}
              {feeList.length === 0 ? <p className="text-sm text-[#64748B]">Daftar biaya belum dapat dimuat.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-[#E2E8F0]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-[#1E3A8A]" />
            <h2 className="font-heading text-lg font-bold">Tagihan & Riwayat Pembayaran</h2>
          </div>
          <div className="mt-5" data-testid="invoice-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Jenis Biaya</TableHead>
                  <TableHead>Atas Nama</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceList.map((i) => (
                  <TableRow key={i.id} data-testid={`invoice-row-${i.id}`}>
                    <TableCell className="font-mono text-xs">{i.nomor}</TableCell>
                    <TableCell className="font-medium">{i.fee_name}</TableCell>
                    <TableCell>{i.payer_name}</TableCell>
                    <TableCell className="font-mono">{rupiah(i.amount)}</TableCell>
                    <TableCell>{tanggal(i.due_date)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CLASS[i.status]} data-testid={`invoice-status-${i.id}`}>
                        {STATUS_LABEL[i.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {i.status === "lunas" ? (
                        <span className="text-xs text-[#15803D]">Terbayar</span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={checkout.isPending}
                          onClick={() => checkout.mutate(i.id)}
                          data-testid={`pay-invoice-button-${i.id}`}
                        >
                          <CreditCard className="mr-2 h-4 w-4" /> Bayar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {invoiceList.length === 0 ? (
              <p className="mt-4 text-sm text-[#64748B]" data-testid="invoice-empty-state">Belum ada tagihan tercatat.</p>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-[#64748B]">
            Pembayaran diproses Stripe (mode uji). Gunakan kartu 4242 4242 4242 4242, tanggal kedaluwarsa apa pun di masa depan, CVC bebas.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
