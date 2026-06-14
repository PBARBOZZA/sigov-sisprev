import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import { useAuth } from "@/lib/auth";
import { canAccessModule, type PermissionLevel } from "@/lib/permissions";
import {
  labelTipoNotificacao,
  listarResumoNotificacoes,
  marcarNotificacaoComoLida,
  type Notificacao,
} from "@/lib/notificacoes";
import {
  LayoutDashboard,
  ClipboardCheck,
  ListChecks,
  Kanban,
  Building2,
  Users,
  FileCheck2,
  Bell,
  Award,
  Gauge,
  FileBarChart,
  LogOut,
  Menu,
  Shield,
  ChevronLeft,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const primaryNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/minhas-acoes", label: "Minhas Ações", icon: ClipboardCheck },
  { to: "/plano-acao", label: "PGA / Plano de Ação", icon: ListChecks },
  { to: "/kanban", label: "Kanban", icon: Kanban },
  { to: "/evidencias", label: "Evidências", icon: FileCheck2 },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/areas", label: "Áreas", icon: Building2 },
];

const supportNav: NavItem[] = [
  { to: "/progestao", label: "Pró-Gestão RPPS", icon: Award },
  { to: "/indicadores", label: "Indicadores", icon: Gauge },
];

const future = [
  "Demandas TCE",
  "Ministério Público",
  "Contratos",
  "Licitações",
  "Conselhos",
  "Investimentos",
  "Educação Previdenciária",
  "Gestão de Riscos",
];

export function AppLayout() {
  const { user, signOut, permissionLevel } = useAuth();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const initials = (user?.user_metadata?.nome || user?.email || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all",
          open ? "w-64" : "w-16",
        )}
      >
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
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          <NavGroup
            title="Principal"
            items={primaryNav}
            open={open}
            pathname={location.pathname}
            permissionLevel={permissionLevel}
          />
          <NavGroup
            title="Gestão e apoio"
            items={supportNav}
            open={open}
            pathname={location.pathname}
            permissionLevel={permissionLevel}
          />
          {open && (
            <div className="border-t border-sidebar-border pt-4">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
                Em breve
              </p>
              {future.map((f) => (
                <div
                  key={f}
                  className="flex items-center justify-between px-3 py-1.5 text-xs text-sidebar-foreground/40"
                >
                  <span className="truncate">{f}</span>
                  <span className="text-[9px] rounded-full bg-sidebar-accent/40 px-1.5 py-0.5">
                    soon
                  </span>
                </div>
              ))}
            </div>
          )}
        </nav>
        <button
          onClick={() => setOpen(!open)}
          className="m-2 flex items-center justify-center gap-1 p-2 rounded-md text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
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
              <MobileNavGroup
                title="Principal"
                items={primaryNav}
                permissionLevel={permissionLevel}
                onNavigate={() => setMobileOpen(false)}
              />
              <MobileNavGroup
                title="Gestão e apoio"
                items={supportNav}
                permissionLevel={permissionLevel}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center gap-3 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <NotificationBell />
          <div className="hidden sm:flex flex-col items-end mr-2">
            <p className="text-sm font-medium">{user?.user_metadata?.nome || user?.email}</p>
            <p className="text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
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

function NotificationBell() {
  const queryClient = useQueryClient();
  const { user, permissionLevel } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["notificacoes-resumo", user?.id, permissionLevel],
    queryFn: listarResumoNotificacoes,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const markRead = useMutation({
    mutationFn: marcarNotificacaoComoLida,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notificacoes-resumo"] });
      void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });

  const count = data?.count ?? 0;
  const items = data?.items ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {count > 0 ? `${count} alerta${count === 1 ? "" : "s"} não lido${count === 1 ? "" : "s"}` : "Nenhum alerta pendente"}
            </p>
          </div>
          {isLoading && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
        </div>

        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tudo em dia por aqui.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <NotificationPreview
                  key={item.id}
                  item={item}
                  onMarkRead={() => markRead.mutate(item.id)}
                  disabled={markRead.isPending}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full justify-center">
            <Link to="/notificacoes">Ver central</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationPreview({
  item,
  onMarkRead,
  disabled,
}: {
  item: Notificacao;
  onMarkRead: () => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {labelTipoNotificacao(item.tipo)}
          </Badge>
          <p className="line-clamp-2 text-sm font-medium">{item.titulo}</p>
          {item.mensagem && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.mensagem}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{formatNotificationDate(item.created_at)}</span>
        <div className="flex items-center gap-1">
          {item.acao_id && (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link to="/plano-acao/$id" params={{ id: item.acao_id }}>
                Ver ação
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onMarkRead}
            disabled={disabled}
          >
            Marcar como lida
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function NavGroup({
  title,
  items,
  open,
  pathname,
  permissionLevel,
}: {
  title: string;
  items: NavItem[];
  open: boolean;
  pathname: string;
  permissionLevel: PermissionLevel;
}) {
  return (
    <div className="space-y-1">
      {open && (
        <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
          {title}
        </p>
      )}
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        const Icon = item.icon;
        const allowed = canAccessModule(permissionLevel, item.to);
        return allowed ? (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {open && <span className="truncate">{item.label}</span>}
          </Link>
        ) : (
          <div
            key={item.to}
            title="Acesso restrito"
            className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/45"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {open && (
              <>
                <span className="truncate flex-1">{item.label}</span>
                <Lock className="h-3.5 w-3.5 shrink-0" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MobileNavGroup({
  title,
  items,
  permissionLevel,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  permissionLevel: PermissionLevel;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1 pb-3">
      <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const allowed = canAccessModule(permissionLevel, item.to);
        return allowed ? (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ) : (
          <div
            key={item.to}
            className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/45"
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            <Lock className="h-3.5 w-3.5" />
          </div>
        );
      })}
    </div>
  );
}
