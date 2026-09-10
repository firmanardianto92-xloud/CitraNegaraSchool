export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number(n || 0),
  );

export const tanggal = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export const STATUS_LABEL = {
  belum_bayar: "Belum Bayar",
  menunggu: "Menunggu Pembayaran",
  lunas: "Lunas",
  menunggu_verifikasi: "Menunggu Verifikasi",
  diverifikasi: "Berkas Diverifikasi",
  diterima: "Diterima",
  ditolak: "Ditolak",
  terjadwal: "Terjadwal",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const STATUS_CLASS = {
  lunas: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  diterima: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  selesai: "bg-[#DCFCE7] text-[#15803D] border-transparent",
  diverifikasi: "bg-[#EFF6FF] text-[#1D4ED8] border-transparent",
  terjadwal: "bg-[#EFF6FF] text-[#1D4ED8] border-transparent",
  menunggu: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  belum_bayar: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  menunggu_verifikasi: "bg-[#FEF3C7] text-[#B45309] border-transparent",
  ditolak: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
  dibatalkan: "bg-[#FEE2E2] text-[#B91C1C] border-transparent",
};
