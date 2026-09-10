import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Bot,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser, useLogout } from "@/lib/session";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/materi-tugas", label: "Materi & Tugas", icon: BookOpen, testid: "nav-materi" },
  { to: "/ppdb", label: "PPDB 2026", icon: GraduationCap, testid: "nav-ppdb" },
  { to: "/pembayaran", label: "Pembayaran", icon: Wallet, testid: "nav-pembayaran" },
  { to: "/mentoring", label: "Mentoring", icon: Users, testid: "nav-mentoring" },
  { to: "/ai-assistant", label: "CitraBot AI", icon: Bot, testid: "nav-assistant" },
];

function NavList({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon, testid }) => (
        <NavLink
          key={to}
          to={to}
          data-testid={testid}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
              isActive
                ? "bg-[#1E3A8A] text-white shadow-[inset_3px_0_0_0_#F59E0B]"
                : "text-slate-300 hover:bg-[#1E293B] hover:text-white"
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 px-6 py-6" data-testid="brand-link">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B] font-bold text-[#0A192F]">
        CN
      </div>
      <div className="leading-tight">
        <p className="font-heading text-base font-bold text-white">Citra Negara</p>
        <p className="text-[11px] uppercase tracking-wider text-slate-400">Learning Portal</p>
      </div>
    </Link>
  );
}

export default function AppShell({ title, subtitle, action, children }) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0A192F] lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto p-4">
          <div className="rounded-xl bg-[#1E293B] p-4">
            <p className="text-xs text-slate-400">Butuh bantuan cepat?</p>
            <Link
              to="/ai-assistant"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#F59E0B]"
              data-testid="sidebar-ai-shortcut"
            >
              <Bot className="h-4 w-4" /> Tanya CitraBot
            </Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-8">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden" data-testid="mobile-menu-button">
                    <Menu className="h-5 w-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-72 border-none bg-[#0A192F] p-0">
                <Brand />
                <NavList />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-lg font-bold tracking-tight text-[#0F172A]" data-testid="page-title">
                {title}
              </h1>
              {subtitle ? <p className="truncate text-sm text-[#64748B]">{subtitle}</p> : null}
            </div>

            {action}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-[#0F172A]" data-testid="current-user-name">
                    {user.name}
                  </p>
                  <Badge className="bg-[#EFF6FF] text-[#1D4ED8]" data-testid="current-user-role">
                    {user.role}
                  </Badge>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] text-sm font-bold text-white">
                  {user.avatar_initials || user.name.slice(0, 2).toUpperCase()}
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-button">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login" data-testid="header-login-link">
                <Button size="sm">Masuk</Button>
              </Link>
            )}
          </div>
        </header>

        <main className="citra-rise px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
