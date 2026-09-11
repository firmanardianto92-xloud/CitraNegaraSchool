import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, GraduationCap, ReceiptText, Wallet } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/lib/session";
import { STATUS_CLASS, STATUS_LABEL, rupiah, tanggal } from "@/lib/format";

function InvoiceTable({ rows, onPay, paying }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-[#64748B]" data-testid="invoice-empty-state">
        Belum ada tagihan pada kategori ini.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No. Invoice</TableHead>
          <TableHead>Jenis Biaya</TableHead>
          <TableHead>Atas Nama</TableHead>
          <TableHead>Jenjang</TableHead>
          <TableHead>Jumlah</TableHead>
          <TableHead>Jatuh Tempo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((i) => (
          <TableRow key={i.id} data-testid={`invoice-row-${i.id}`}>
            <TableCell className="font-mono text-xs">{i.nomor}</TableCell>
            <TableCell className="font-medium">{i.fee_name}</TableCell>
            <TableCell>{i.payer_name}</TableCell>
            <TableCell className="uppercase">{i.level}{i.jurusan ? ` · ${i.jurusan}` : ""}</TableCell>
            <TableCell className="font-mono">{rupiah(i.amount)}</TableCell>
            <TableCell>{tanggal(i.due_date)}</TableCell>
            <TableCell>
              <Badge className={STATUS_CLASS[i.status]} data-testid={`invoice-status-${i.id}`}>
                {STATUS_LABEL[i.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {i.status === "lunas" ? (
                <Link to={`/kwitansi/${i.id}`} data-testid={`receipt-link-${i.id}`}>
                  <Button size="sm" variant="outline">
                    <ReceiptText className="mr-2 h-4 w-4" /> Kwitansi
                  </Button>
                </Link>
              ) : (
                <Button size="sm" disabled={paying} onClick={() => onPay(i.id)} data-testid={`pay-invoice-button-${i.id}`}>
                  <CreditCard className="mr-2 h-4 w-4" /> Bayar
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Pembayaran() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [tab, setTab] = useState("admission");
  const isSiswa = user?.role === "siswa";
  const payerFilter = isSiswa && user?.id ? `?payer_ref=${user.id}` : "";

  const fees = useQuery({
    queryKey: ["fees", user?.level],
    queryFn: () => apiGet(`/payments/fees${isSiswa && user?.level ? `?level=${user.level}` : ""}`),
  });
  const invoices = useQuery({
    queryKey: ["invoices", "page", user?.id],
    queryFn: () => apiGet(`/payments/invoices${payerFilter}`),
  });

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
  const admissionRows = invoiceList.filter((i) => i.kategori === "admission");
  const sekolahRows = invoiceList.filter((i) => i.kategori !== "admission");
  const belumLunas = invoiceList.filter((i) => i.status !== "lunas");
  const sudahLunas = invoiceList.filter((i) => i.status === "lunas");
  const totalBelum = belumLunas.reduce((s, i) => s + i.amount, 0);
  const totalLunas = sudahLunas.reduce((s, i) => s + i.amount, 0);

  return (
    <AppShell
      title="Admission & Pembayaran"
      subtitle={
        isSiswa
          ? `Tagihan ${user?.name} · ${user?.level?.toUpperCase() ?? ""}${user?.jurusan ? ` ${user.jurusan}` : ""} · Orang tua: ${user?.nama_orang_tua ?? "-"}`
          : "Rincian biaya sekolah, tagihan, dan riwayat pembayaran seluruh siswa"
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none bg-[linear-gradient(135deg,#0A192F,#1E3A8A)]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">Belum Terbayar</p>
            <p className="mt-2 font-heading text-3xl font-bold text-white" data-testid="total-tagihan">{rupiah(totalBelum)}</p>
            <p className="mt-3 text-sm text-slate-300" data-testid="jumlah-belum-lunas">{belumLunas.length} tagihan menunggu</p>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Sudah Terbayar</p>
            <p className="mt-2 font-heading text-3xl font-bold text-[#15803D]" data-testid="total-lunas">{rupiah(totalLunas)}</p>
            <p className="mt-3 text-sm text-[#64748B]" data-testid="jumlah-lunas">{sudahLunas.length} tagihan lunas · kwitansi tersedia</p>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Tarif Jenjang</p>
            <div className="mt-3 space-y-1" data-testid="fee-catalog">
              {feeList.slice(0, 4).map((f) => (
                <p key={`${f.level}-${f.code}`} className="font-mono text-xs text-[#475569]" data-testid={`fee-item-${f.level}-${f.code}`}>
                  {f.name.split(" ")[0]} {f.code === "spp" ? "SPP" : ""} — {rupiah(f.amount)}
                </p>
              ))}
              {feeList.length === 0 ? <p className="text-sm text-[#64748B]">Tarif belum dapat dimuat.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="mt-6">
        <TabsList data-testid="payment-tabs">
          <TabsTrigger value="admission" data-testid="tab-admission">
            <GraduationCap className="mr-2 h-4 w-4" /> Admission / PPDB
          </TabsTrigger>
          <TabsTrigger value="sekolah" data-testid="tab-pembayaran-sekolah">
            <Wallet className="mr-2 h-4 w-4" /> Pembayaran Sekolah
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admission" className="mt-6">
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-6">
              <h2 className="font-heading text-lg font-bold">Biaya Penerimaan Awal (Registrasi & Booking Kursi)</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Tagihan ini dibuat otomatis saat pendaftaran PPDB dan mengikuti tarif jenjang yang dipilih.
              </p>
              <div className="mt-5" data-testid="invoice-table-admission">
                <InvoiceTable rows={admissionRows} onPay={(id) => checkout.mutate(id)} paying={checkout.isPending} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sekolah" className="mt-6">
          <Card className="border-[#E2E8F0]">
            <CardContent className="p-6">
              <h2 className="font-heading text-lg font-bold">Biaya Rutin Sekolah (SPP, Seragam & Buku)</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Pembayaran diproses Stripe. Kartu uji 4242 4242 4242 4242, kedaluwarsa masa depan, CVC bebas.
              </p>
              <div className="mt-5" data-testid="invoice-table-sekolah">
                <InvoiceTable rows={sekolahRows} onPay={(id) => checkout.mutate(id)} paying={checkout.isPending} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
