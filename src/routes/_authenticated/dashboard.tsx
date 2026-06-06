import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ListChecks, Clock, CheckCircle2, AlertTriangle, AlarmClock, TrendingUp, Loader2
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid
} from "recharts";
import { STATUS_LABELS, fmtDate, prazoCor } from "@/lib/acao-helpers";
import { differenceInDays, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Executivo — SIGOV-SISPREV" }] }),
  component: Dashboard,
});

const STATUS_COLOR_HEX: Record<string, string> = {
  nao_iniciada: "#94a3b8", em_andamento: "#0ea5e9",
  concluida: "#16a34a", atrasada: "#dc2626", cancelada: "#64748b",
};

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-acoes"],
    queryFn: async () => {
      const { data: acoes } = await supabase
        .from("acoes")
        .select("*, area:areas(nome), responsavel:profiles!acoes_responsavel_id_fkey(nome), plano:plano_anual(id,ano,nome), eixo:pga_eixos(id,nome,codigo), programa_ref:pga_programas(id,nome,codigo)")
        .order("updated_at", { ascending: false });
      return acoes ?? [];
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>;
  const acoes = data ?? [];

  const total = acoes.length;
  const byStatus = acoes.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const concluidas = byStatus.concluida || 0;
  const emAnd = byStatus.em_andamento || 0;
  const naoIni = byStatus.nao_iniciada || 0;
  const atrasadas = acoes.filter((a) => a.prazo_final && a.status !== "concluida" && a.status !== "cancelada" && differenceInDays(parseISO(a.prazo_final), new Date()) < 0).length;
  const vencendo30 = acoes.filter((a) => {
    if (!a.prazo_final || a.status === "concluida" || a.status === "cancelada") return false;
    const d = differenceInDays(parseISO(a.prazo_final), new Date());
    return d >= 0 && d <= 30;
  }).length;
  const percGeral = total ? Math.round(acoes.reduce((s, a) => s + (a.percentual_execucao || 0), 0) / total) : 0;

  const pieData = Object.entries(byStatus).map(([s, v]) => ({ name: STATUS_LABELS[s] ?? s, value: v, key: s }));

  const byArea = Object.values(acoes.reduce<Record<string, { area: string; total: number; concluidas: number }>>((acc, a) => {
    const nome = (a as any).area?.nome ?? "Sem área";
    if (!acc[nome]) acc[nome] = { area: nome, total: 0, concluidas: 0 };
    acc[nome].total++;
    if (a.status === "concluida") acc[nome].concluidas++;
    return acc;
  }, {}));

  const byResp = Object.values(acoes.reduce<Record<string, { resp: string; total: number }>>((acc, a) => {
    const nome = (a as any).responsavel?.nome ?? (a as any).responsavel_nome ?? "Sem responsável";
    if (!acc[nome]) acc[nome] = { resp: nome, total: 0 };
    acc[nome].total++;
    return acc;
  }, {})).sort((a, b) => b.total - a.total).slice(0, 8);

  const byEixo = Object.values(acoes.reduce<Record<string, { eixo: string; total: number; concluidas: number; percentual: number }>>((acc, a) => {
    const nome = getEixoNome(a);
    if (!acc[nome]) acc[nome] = { eixo: nome, total: 0, concluidas: 0, percentual: 0 };
    acc[nome].total++;
    acc[nome].percentual += a.percentual_execucao || 0;
    if (a.status === "concluida") acc[nome].concluidas++;
    return acc;
  }, {})).map((e) => ({
    ...e,
    percentual: e.total ? Math.round(e.percentual / e.total) : 0,
  })).sort((a, b) => a.eixo.localeCompare(b.eixo));

  const byPrograma = Object.values(acoes.reduce<Record<string, { programa: string; total: number; concluidas: number }>>((acc, a) => {
    const nome = getProgramaNome(a);
    if (!acc[nome]) acc[nome] = { programa: nome, total: 0, concluidas: 0 };
    acc[nome].total++;
    if (a.status === "concluida") acc[nome].concluidas++;
    return acc;
  }, {})).sort((a, b) => b.total - a.total);

  const proximasVencer = acoes.filter((a) => {
    if (!a.prazo_final || a.status === "concluida") return false;
    const d = differenceInDays(parseISO(a.prazo_final), new Date());
    return d >= 0 && d <= 30;
  }).slice(0, 5);

  const ultimasAtualizadas = acoes.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">Visão gerencial do Plano de Gestão Anual e Pró-Gestão RPPS.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total de ações" value={total} icon={ListChecks} />
        <KpiCard label="Não iniciadas" value={naoIni} icon={Clock} tone="muted" />
        <KpiCard label="Em andamento" value={emAnd} icon={TrendingUp} tone="info" />
        <KpiCard label="Concluídas" value={concluidas} icon={CheckCircle2} tone="success" />
        <KpiCard label="Atrasadas" value={atrasadas} icon={AlertTriangle} tone="destructive" />
        <KpiCard label="Vencendo 30d" value={vencendo30} icon={AlarmClock} tone="warning" />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">Percentual geral de execução</p>
            <p className="text-xs text-muted-foreground">Média ponderada de todas as ações ativas</p>
          </div>
          <p className="text-3xl font-bold text-primary">{percGeral}%</p>
        </div>
        <Progress value={percGeral} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Execução por Eixo</h3>
          {byEixo.length === 0 ? <Empty /> : (
            <ul className="space-y-4">
              {byEixo.map((e) => (
                <li key={e.eixo}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.eixo}</p>
                      <p className="text-xs text-muted-foreground">{e.concluidas} de {e.total} ações concluídas</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{e.percentual}%</p>
                  </div>
                  <Progress value={e.percentual} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Ações por Programa</h3>
          {byPrograma.length === 0 ? <Empty /> : (
            <ul className="divide-y">
              {byPrograma.map((p) => (
                <li key={p.programa} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium min-w-0 truncate">{p.programa}</p>
                    <Badge variant="outline">{p.total}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.concluidas} concluídas</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Ações por status</h3>
          {pieData.length === 0 ? <Empty /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((d) => <Cell key={d.key} fill={STATUS_COLOR_HEX[d.key] || "#94a3b8"} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Ações por área</h3>
          {byArea.length === 0 ? <Empty /> : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={byArea}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="area" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" />
                  <Bar dataKey="concluidas" fill="#16a34a" name="Concluídas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Top responsáveis por carga de ações</h3>
        {byResp.length === 0 ? <Empty /> : (
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byResp} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="resp" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Ações vencendo nos próximos 30 dias</h3>
          {proximasVencer.length === 0 ? <Empty text="Nenhuma ação próxima do vencimento." /> : (
            <ul className="space-y-2">
              {proximasVencer.map((a) => {
                const pz = prazoCor(a.prazo_final, a.status);
                return (
                  <li key={a.id}>
                    <Link to="/plano-acao/$id" params={{ id: a.id }} className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-accent">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.titulo}</p>
                        <p className="text-xs text-muted-foreground">{(a as any).area?.nome ?? "—"} · {fmtDate(a.prazo_final)}</p>
                      </div>
                      <Badge className={pz.color}>{pz.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Últimas ações atualizadas</h3>
          {ultimasAtualizadas.length === 0 ? <Empty /> : (
            <ul className="space-y-2">
              {ultimasAtualizadas.map((a) => (
                <li key={a.id}>
                  <Link to="/plano-acao/$id" params={{ id: a.id }} className="flex items-center justify-between gap-3 p-3 rounded-md border hover:bg-accent">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">{(a as any).responsavel?.nome ?? (a as any).responsavel_nome ?? "—"} · {a.percentual_execucao}%</p>
                    </div>
                    <Badge variant="outline">{STATUS_LABELS[a.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone = "primary" }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`grid h-8 w-8 place-items-center rounded-md ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function Empty({ text = "Sem dados ainda." }: { text?: string }) {
  return <p className="text-sm text-muted-foreground text-center py-8">{text}</p>;
}

function getEixoNome(acao: any) {
  return acao.eixo?.nome ?? acao.eixo_estrategico ?? "Sem eixo";
}

function getProgramaNome(acao: any) {
  return acao.programa_ref?.nome ?? acao.programa ?? "Sem programa";
}
