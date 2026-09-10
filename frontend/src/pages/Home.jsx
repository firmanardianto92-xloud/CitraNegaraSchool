import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Bot, GraduationCap, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const HERO =
  "https://images.unsplash.com/photo-1564981797816-1043664bf78d?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80";

const FITUR = [
  { icon: BookOpen, title: "Materi, Tugas & Dokumen", desc: "Repositori digital untuk modul pelajaran, tugas dengan tenggat, dan dokumen resmi sekolah." },
  { icon: GraduationCap, title: "PPDB 2026", desc: "Pendaftaran siswa baru online, unggah berkas, hingga verifikasi dan pengumuman." },
  { icon: Wallet, title: "Biaya & Pembayaran", desc: "Rincian biaya registrasi, booking kursi, SPP, dan seragam dengan pembayaran kartu (Stripe)." },
  { icon: Users, title: "Sistem Mentoring", desc: "Jadwalkan sesi 1-on-1 bersama guru dan konselor BK, lengkap dengan catatan tindak lanjut." },
  { icon: Bot, title: "CitraBot AI", desc: "Asisten AI berbahasa Indonesia untuk bantuan belajar dan tanya jawab PPDB." },
  { icon: ShieldCheck, title: "Multi Peran", desc: "Akses berbeda untuk Siswa, Guru, dan Admin dalam satu portal terpadu." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A192F] text-sm font-bold text-[#F59E0B]">
            CN
          </div>
          <p className="font-heading text-base font-bold tracking-tight">Sekolah Citra Negara</p>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/ppdb" data-testid="home-ppdb-link">
              <Button variant="ghost" size="sm">Daftar PPDB</Button>
            </Link>
            <Link to="/login" data-testid="home-login-link">
              <Button size="sm">Masuk Portal</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0A192F]">
        <img src={HERO} alt="Gedung utama Sekolah Citra Negara" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0A192F_10%,rgba(30,58,138,0.85)_60%,rgba(23,37,84,0.9)_100%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-12 lg:py-28">
          <div className="citra-rise lg:col-span-7">
            <span className="inline-block rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#92400E]">
              Tahun Ajaran 2026/2027
            </span>
            <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[56px]">
              Satu portal untuk belajar,<br />
              <span className="text-[#F59E0B]">mendaftar, dan bertumbuh.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              LMS Citra Negara menyatukan materi pembelajaran, tugas, administrasi PPDB, pembayaran biaya
              sekolah, mentoring guru, dan asisten AI dalam satu sistem yang rapi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" data-testid="hero-masuk-button">
                <Button size="lg" className="bg-[#F59E0B] text-[#0A192F] hover:bg-[#d98b08]">
                  Masuk sebagai Siswa / Guru / Admin <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/ppdb" data-testid="hero-ppdb-button">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15">
                  Formulir PPDB 2026
                </Button>
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { k: "1.248", v: "Siswa aktif" },
                { k: "86", v: "Guru & staf" },
                { k: "Rp 250rb", v: "Biaya pendaftaran" },
                { k: "24/7", v: "Asisten CitraBot" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <p className="font-heading text-2xl font-bold text-white">{s.k}</p>
                  <p className="text-sm text-slate-300">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Fitur Portal</p>
        <h2 className="mt-2 max-w-2xl font-heading text-3xl font-bold tracking-tight">
          Semua kebutuhan akademik dan administrasi sekolah dalam satu tempat
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FITUR.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="citra-lift border-[#E2E8F0]" data-testid={`feature-card-${title.split(" ")[0].toLowerCase()}`}>
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E3A8A]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white py-8">
        <div className="mx-auto max-w-6xl px-5 text-sm text-[#64748B]">
          © 2026 Sekolah Citra Negara — Jl. Raya Citra No. 1, Depok. Portal pembelajaran & administrasi.
        </div>
      </footer>
    </div>
  );
}
