import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/lib/session";

const DEMO = [
  { role: "siswa", label: "Siswa — Ahmad Fauzi", email: "siswa@citranegara.sch.id" },
  { role: "guru", label: "Guru — Ibu Sri Wahyuni", email: "guru@citranegara.sch.id" },
  { role: "admin", label: "Admin — Pak Hendra", email: "admin@citranegara.sch.id" },
];
const PASSWORD = "citra123";

export default function Login() {
  const [email, setEmail] = useState(DEMO[0].email);
  const [password, setPassword] = useState(PASSWORD);
  const login = useLogin();
  const navigate = useNavigate();

  const submit = async (e, overrideEmail) => {
    e?.preventDefault();
    const payload = { email: overrideEmail || email, password: overrideEmail ? PASSWORD : password };
    try {
      const user = await login.mutateAsync(payload);
      toast.success(`Selamat datang, ${user.name}`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.body?.detail || "Gagal masuk. Periksa email dan kata sandi.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0A192F] lg:block">
        <img
          src="https://images.unsplash.com/photo-1552890143-884bbdbb8b54?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"
          alt="Perpustakaan Citra Negara"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0A192F_20%,rgba(30,58,138,0.8)_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-3" data-testid="login-brand-link">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B] font-bold text-[#0A192F]">CN</div>
            <p className="font-heading font-bold text-white">Sekolah Citra Negara</p>
          </Link>
          <div>
            <h2 className="font-heading text-4xl font-bold leading-tight tracking-tight text-white">
              Berkarakter, Berprestasi,<br />Berdaya Saing.
            </h2>
            <p className="mt-4 max-w-md text-slate-300">
              Portal terpadu untuk siswa, guru, dan administrasi sekolah — mulai dari materi belajar sampai
              pembayaran biaya PPDB.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#F8FAFC] px-5 py-12">
        <div className="w-full max-w-md citra-rise">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Masuk Portal</h1>
          <p className="mt-2 text-sm text-[#64748B]">Gunakan akun demo di bawah untuk mencoba setiap peran.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending} data-testid="login-submit-button">
              {login.isPending ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <Card className="mt-8 border-[#E2E8F0]">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Login cepat demo</p>
              <div className="mt-3 space-y-2">
                {DEMO.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={(e) => submit(e, d.email)}
                    data-testid={`role-switch-${d.role}`}
                    className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] px-4 py-3 text-left text-sm transition-colors duration-200 hover:border-[#1E3A8A] hover:bg-[#EFF6FF]"
                  >
                    <span className="font-medium">{d.label}</span>
                    <span className="font-mono text-xs text-[#64748B]">{d.role}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 font-mono text-xs text-[#64748B]">Kata sandi semua akun: citra123</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
