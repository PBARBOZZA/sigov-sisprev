import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, AlertTriangle, AlarmClock, CheckCircle2 } from "lucide-react";
import { prazoCor, fmtDate } from "@/lib/acao-helpers";
import { differenceInDays, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({ meta: [{ title: "Central de Notificações — SIGOV-SISPREV" }] }),
  component: Notificacoes,
});

function Notificacoes() {
  const { user } = useAuth();

  const { data: acoes, isLoading } = useQuery({
    queryKey: ["notif-acoes", user?.id],
    queryFn: async () => (await supabase.from("acoes")
      .select("*, area:areas(nome), responsavel:profiles!acoes_responsavel_id_fkey(nome)")
      .neq("status", "concluida").neq("status", "cancelada")).data ?? [],
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const todas = acoes ?? [];
  const vencidas = todas.filter((a) => a.prazo_final && differenceInDays(parseISO(a.prazo_final), new Date()) < 0);
  const em3 = todas.filter((a) => { if (!a.prazo_final) return false; const d = differenceInDays(parseISO(a.prazo_final), new Date()); return d >= 0 && d <= 3; });
  const em7 = todas.filter((a) => { if (!a.prazo_final) return false; const d = differenceInDays(parseISO(a.prazo_final), new Date()); return d > 3 && d <= 7; });
  const em30 = todas.filter((a) => { if (!a.prazo_final) return false; const d = differenceInDays(parseISO(a.prazo_final), new Date()); return d > 7 && d <= 30; });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> Central de Notificações</h1>
        <p className="text-sm text-muted-foreground">Alertas moderados de prazos do Plano de Ação e Pró-Gestão RPPS.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Vencidas" value={vencidas.length} icon={AlertTriangle} tone="bg-foreground text-background" />
        <KpiCard label="Em 3 dias" value={em3.length} icon={AlertTriangle} tone="bg-destructive/15 text-destructive" />
        <KpiCard label="Em 7 dias" value={em7.length} icon={AlarmClock} tone="bg-warning/20 text-warning-foreground" />
        <KpiCard label="Em 30 dias" value={em30.length} icon={CheckCircle2} tone="bg-info/15 text-info" />
      </div>

      <Section title="Vencidas" items={vencidas} />
      <Section title="Vencendo em até 3 dias" items={em3} />
      <Section title="Vencendo em até 7 dias" items={em7} />
      <Section title="Vencendo em até 30 dias" items={em30} />

      <Card className="p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <strong>Política moderada de alertas:</strong> notificações são geradas apenas para ações com responsável e prazo definidos.
          E-mails são enviados ao responsável 7 e 3 dias antes, no vencimento e a cada 15 dias de atraso (com escalonamento ao gestor e diretoria).
          O sistema evita envios diários repetidos.
        </p>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: any) {
  return (
    <Card className="p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${tone} mb-2`}><Icon className="h-4 w-4" /></div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">{title} <span className="text-muted-foreground text-sm">({items.length})</span></h3>
      <ul className="space-y-2">
        {items.map((a) => {
          const pz = prazoCor(a.prazo_final, a.status);
          return (
            <li key={a.id}>
              <Link to="/plano-acao/$id" params={{ id: a.id }} className="flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-accent">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">{a.responsavel?.nome ?? "Sem responsável"} · {a.area?.nome ?? "—"} · {fmtDate(a.prazo_final)}</p>
                </div>
                <Badge className={pz.color}>{pz.label}</Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
