import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, ListChecks, Kanban, Building2, Users, FileCheck2, Bell,
  Award, Gauge, FileBarChart, Settings, LogOut, Menu, Shield, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Permission = "all" | "admin" | "manage";
interface NavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; perm?: Permission; badge?: string; }

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plano-acao", label: "Plano de Ação", icon: ListChecks },
  { to: "/kanban", label: "Kanban", icon: Kanban },
  { to: "/areas", label: "Áreas", icon: Building2, perm: "admin" },
  { to: "/usuarios", label: "Usuários", icon: Users, perm: "admin" },
  { to: "/evidencias", label: "Evidências", icon: FileCheck2 },
  { to: "/progestao", label: "Pró-Gestão RPPS", icon: Award, perm: "manage" },
  { to: "/indicadores", label: "Indicadores", icon: Gauge, perm: "manage" },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, perm: "manage" },
];

const future = [
  "Demandas TCE", "Ministério Público", "Contratos", "Licitações",
  "Conselhos", "Investimentos", "Educação Previdenciária", "Gestão de Riscos",
];

export function AppLayout() {
  const { user, signOut, isAdmin, canManage } = useAuth();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const canSee = (perm?: Permission) =>
    !perm || perm === "all" || (perm === "admin" && isAdmin) || (perm === "manage" && canManage);
  const visibleNav = nav.filter((i) => canSee(i.perm));

  const initials = (user?.user_metadata?.nome || user?.email || "U")
    .split(/\s+/).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join("");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all",
        open ? "w-64" : "w-16"
      )}>
        <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          {open && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">SIGOV-SISPREV</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">SISPREV-TO</p>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                <Icon className="h-4 w-4 shrink-0" />
                {open && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
          {open && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Em breve</p>
              {future.map((f) => (
                <div key={f} className="flex items-center justify-between px-3 py-1.5 text-xs text-sidebar-foreground/40">
                  <span className="truncate">{f}</span>
                  <span className="text-[9px] rounded-full bg-sidebar-accent/40 px-1.5 py-0.5">soon</span>
                </div>
              ))}
            </div>
          )}
        </nav>
        <button onClick={() => setOpen(!open)}
          className="m-2 flex items-center justify-center gap-1 p-2 rounded-md text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", !open && "rotate-180")} />
          {open && "Recolher"}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
              <Shield className="h-5 w-5 text-sidebar-primary" />
              <p className="text-sm font-semibold">SIGOV-SISPREV</p>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
                    <Icon className="h-4 w-4" /><span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center gap-3 px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/notificacoes" })}>
            <Bell className="h-5 w-5" />
          </Button>
          <div className="hidden sm:flex flex-col items-end mr-2">
            <p className="text-sm font-medium">{user?.user_metadata?.nome || user?.email}</p>
            <p className="text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
