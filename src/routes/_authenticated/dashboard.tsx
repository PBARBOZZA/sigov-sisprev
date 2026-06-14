import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { buscarAcoesPlanoAcao, normalizarStatusAcao, type AcaoPlano } from "@/lib/acoes-data";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListChecks,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlarmClock,
  TrendingUp,
  Loader2,
  UserCheck,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { STATUS_LABELS, fmtDate, prazoCor } from "@/lib/acao-helpers";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Executivo - SIGOV-SISPREV" }] }),
  component: Dashboard,
});

const STATUS_COLOR_HEX: Record<string, string> = {
  nao_iniciada: "#94a3b8",
  em_andamento: "#0ea5e9",
  concluida: "#16a34a",
  atrasada: "#dc2626",
  cancelada: "#64748b",
};

type RefOption = { id: string; nome: string | null };
type Apoio = { acao_id: string; usuario_id: string };
type Evidencia = { acao_id: string };
type ChartItem = { name: string; value: number; key?: string };

function Dashboard() {
  const { user, permissionLevel } = useAuth();

  const { data: acoes, isLoading } = useQuery({
    queryKey: ["acoes-list"],
    queryFn: buscarAcoesPlanoAcao,
  });

  const { data: areas } = useQuery({
    queryKey: ["areas-options"],
    queryFn: async () => (await supabase.from("areas").select("id,nome").order("nome")).data ?? [],
  });

  const { data: usuarios } = useQuery({
    queryKey: ["usuarios-options"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id,nome").order("nome")).data ?? [],
  });

  const { data: eixos } = useQuery({
    queryKey: ["pga-eixos-options"],
    queryFn: async () =>
      (await supabase.from("pga_eixos").select("id,nome").order("ordem")).data ?? [],
  });

  const { data: programas } = useQuery({
    queryKey: ["pga-programas-options"],
    queryFn: async () =>
      (await supabase.from("pga_programas").select("id,nome").order("ordem")).data ?? [],
  });

  const { data: evidencias } = useQuery({
    queryKey: ["dashboard-evidencias-index"],
    queryFn: async () => (await supabase.from("evidencias").select("acao_id")).data ?? [],
  });

  const { data: apoiadores } = useQuery({
    queryKey: ["acoes-apoiadores-list"],
    queryFn: async () =>
      (await supabase.from("acoes_apoiadores").select("acao_id,usuario_id")).data ?? [],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const items = acoes ?? [];
  const evidenceActionIds = new Set((evidencias ?? []).map((e: Evidencia) => e.acao_id));
  const apoioActionIds = new Set(
    (apoiadores ?? [])
      .filter((apoiador: Apoio) => apoiador.usuario_id === user?.id)
      .map((apoiador: Apoio) => apoiador.acao_id),
  );

  const total = items.length;
  const naoIniciadas = countStatus(items, "nao_iniciada");
  const emAndamento = countStatus(items, "em_andamento");
  const concluidas = countStatus(items, "concluida");
  const atrasadasLista = items.filter(isAtrasada);
  const vencendo30Lista = items.filter(isVencendo30);
  const semEvidencia = items.filter((acao) => !evidenceActionIds.has(acao.id));
  const percentualGeral = total
    ? Math.round(items.reduce((sum, acao) => sum + (acao.percentual_execucao ?? 0), 0) / total)
    : 0;

  const minhasAcoes = user
    ? items.filter((acao) => acao.responsavel_id === user.id || apoioActionIds.has(acao.id))
    : [];
  const minhasPendencias = {
    total: minhasAcoes.length,
    emAndamento: minhasAcoes.filter((acao) => normalizarStatusAcao(acao.status) === "em_andamento")
      .length,
    atrasadas: minhasAcoes.filter(isAtrasada).length,
    vencendo30: minhasAcoes.filter(isVencendo30).length,
  };

  const proGestao = calcProGestao(items, eixos, programas);
  const statusData = buildStatusData(items);
  const areaData = buildAreaData(items, areas);
  const responsavelData = buildResponsavelData(items, usuarios).slice(0, 8);
  const evolucaoData = buildEvolucaoConclusao(items);
  const ultimasAtualizadas = [...items]
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">
            Visão de consulta do PGA, governança e pendências operacionais.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/plano-acao">Ver Plano de Ação</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiLink
          label="Total de ações"
          value={total}
          description="PGA completo"
          icon={ListChecks}
          to="/plano-acao"
        />
        <KpiLink
          label="Não iniciadas"
          value={naoIniciadas}
          icon={Clock}
          tone="muted"
          to="/plano-acao"
          search={{ status: "nao_iniciada" }}
        />
        <KpiLink
          label="Em andamento"
          value={emAndamento}
          icon={TrendingUp}
          tone="info"
          to="/plano-acao"
          search={{ status: "em_andamento" }}
        />
        <KpiLink
          label="Concluídas"
          value={concluidas}
          icon={CheckCircle2}
          tone="success"
          to="/plano-acao"
          search={{ status: "concluida" }}
        />
        <KpiLink
          label="Atrasadas"
          value={atrasadasLista.length}
          icon={AlertTriangle}
          tone="destructive"
          to="/plano-acao"
          search={{ prazo: "atrasadas" }}
        />
        <KpiLink
          label="Vencendo 30 dias"
          value={vencendo30Lista.length}
          icon={AlarmClock}
          tone="warning"
          to="/plano-acao"
          search={{ prazo: "vence_30" }}
        />
        <KpiLink
          label="Execução geral"
          value={`${percentualGeral}%`}
          description="Média das ações"
          icon={ShieldCheck}
          to="/plano-acao"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Minhas Pendências</p>
              <p className="text-xs text-muted-foreground">
                Ações sob sua responsabilidade ou apoio.
              </p>
            </div>
            {permissionLevel !== "consulta" && (
              <Button asChild size="sm" variant="outline">
                <Link to="/minhas-acoes">Ver minhas ações</Link>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniMetric label="Minhas ações" value={minhasPendencias.total} />
            <MiniMetric label="Em andamento" value={minhasPendencias.emAndamento} tone="info" />
            <MiniMetric label="Atrasadas" value={minhasPendencias.atrasadas} tone="destructive" />
            <MiniMetric label="Vencendo 30d" value={minhasPendencias.vencendo30} tone="warning" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Pró-Gestão / Governança</p>
              <p className="text-xs text-muted-foreground">
                Identificado por eixo ou programa de governança, controle interno, Pró-Gestão ou
                educação previdenciária.
              </p>
            </div>
            <p className="text-2xl font-bold text-primary">{proGestao.percentual}%</p>
          </div>
          <Progress value={proGestao.percentual} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniMetric label="Total" value={proGestao.total} />
            <MiniMetric label="Concluídas" value={proGestao.concluidas} tone="success" />
            <MiniMetric label="Em andamento" value={proGestao.emAndamento} tone="info" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ações por status">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={82}
                label
              >
                {statusData.map((item) => (
                  <Cell key={item.key} fill={STATUS_COLOR_HEX[item.key ?? ""] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ações por área">
          <ResponsiveContainer>
            <BarChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" name="Ações" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ações por responsável">
          <ResponsiveContainer>
            <BarChart data={responsavelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" name="Ações" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolução de conclusão">
          {evolucaoData.length < 2 ? (
            <Empty text="Dados insuficientes para evolução histórica." />
          ) : (
            <ResponsiveContainer>
              <LineChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Concluídas"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <QuickList
          title="Ações atrasadas"
          items={atrasadasLista.slice(0, 6)}
          areas={areas}
          usuarios={usuarios}
        />
        <QuickList
          title="Ações vencendo em 30 dias"
          items={vencendo30Lista.slice(0, 6)}
          areas={areas}
          usuarios={usuarios}
        />
        <QuickList
          title="Últimas ações atualizadas"
          items={ultimasAtualizadas}
          areas={areas}
          usuarios={usuarios}
          showUpdatedAt
        />
        <QuickList
          title="Ações sem evidência cadastrada"
          items={semEvidencia.slice(0, 6)}
          areas={areas}
          usuarios={usuarios}
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/evidencias">Ver evidências</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function KpiLink({
  label,
  value,
  description,
  icon: Icon,
  tone = "primary",
  to,
  search,
}: {
  label: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "info" | "warning" | "destructive" | "muted";
  to: "/plano-acao" | "/evidencias";
  search?: Record<string, string>;
}) {
  return (
    <Link to={to} search={search} className="block">
      <Card className="h-full p-4 transition-colors hover:bg-accent">
        <div className="mb-3 flex items-center justify-between">
          <div className={`grid h-8 w-8 place-items-center rounded-md border ${toneClass(tone)}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {description && <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>}
      </Card>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "success" | "info" | "warning" | "destructive";
}) {
  const textTone = {
    primary: "text-primary",
    success: "text-success",
    info: "text-info",
    warning: "text-warning-foreground",
    destructive: "text-destructive",
  }[tone];

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className={`text-xl font-bold ${textTone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="h-64">{children}</div>
    </Card>
  );
}

function QuickList({
  title,
  items,
  areas,
  usuarios,
  showUpdatedAt = false,
  action,
}: {
  title: string;
  items: AcaoPlano[];
  areas?: RefOption[];
  usuarios?: RefOption[];
  showUpdatedAt?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-2">
          {items.map((acao) => {
            const status = normalizarStatusAcao(acao.status);
            const prazo = prazoCor(acao.prazo_final, status);
            return (
              <li key={acao.id}>
                <Link
                  to="/plano-acao/$id"
                  params={{ id: acao.id }}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{acao.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {getAreaNome(acao, areas)} - {getResponsavelNome(acao, usuarios)}
                    </p>
                    {showUpdatedAt && (
                      <p className="text-xs text-muted-foreground">
                        Atualizada em {fmtDate(acao.updated_at)}
                      </p>
                    )}
                  </div>
                  <Badge className={prazo.color}>{prazo.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Empty({ text = "Sem dados para exibir." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function toneClass(tone: string) {
  const toneMap: Record<string, string> = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    success: "border-success/25 bg-success/15 text-success",
    info: "border-info/25 bg-info/15 text-info",
    warning: "border-warning/30 bg-warning/20 text-warning-foreground",
    destructive: "border-destructive/25 bg-destructive/15 text-destructive",
    muted: "border-border bg-muted text-muted-foreground",
  };
  return toneMap[tone] ?? toneMap.primary;
}

function countStatus(acoes: AcaoPlano[], status: string) {
  return acoes.filter((acao) => normalizarStatusAcao(acao.status) === status).length;
}

function isAtrasada(acao: AcaoPlano) {
  if (!acao.prazo_final || isClosed(acao)) return false;
  return differenceInDays(parseISO(acao.prazo_final), new Date()) < 0;
}

function isVencendo30(acao: AcaoPlano) {
  if (!acao.prazo_final || isClosed(acao)) return false;
  const days = differenceInDays(parseISO(acao.prazo_final), new Date());
  return days >= 0 && days <= 30;
}

function isClosed(acao: AcaoPlano) {
  const status = normalizarStatusAcao(acao.status);
  return status === "concluida" || status === "cancelada";
}

function buildStatusData(acoes: AcaoPlano[]): ChartItem[] {
  const counts = acoes.reduce<Record<string, number>>((acc, acao) => {
    const status = normalizarStatusAcao(acao.status);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([status, value]) => ({
    name: STATUS_LABELS[status] ?? status,
    value,
    key: status,
  }));
}

function buildAreaData(acoes: AcaoPlano[], areas?: RefOption[]): ChartItem[] {
  return Object.values(
    acoes.reduce<Record<string, ChartItem>>((acc, acao) => {
      const name = getAreaNome(acao, areas);
      if (!acc[name]) acc[name] = { name, value: 0 };
      acc[name].value++;
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);
}

function buildResponsavelData(acoes: AcaoPlano[], usuarios?: RefOption[]): ChartItem[] {
  return Object.values(
    acoes.reduce<Record<string, ChartItem>>((acc, acao) => {
      const name = getResponsavelNome(acao, usuarios);
      if (!acc[name]) acc[name] = { name, value: 0 };
      acc[name].value++;
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);
}

function buildEvolucaoConclusao(acoes: AcaoPlano[]): ChartItem[] {
  const concluidas = acoes
    .filter((acao) => normalizarStatusAcao(acao.status) === "concluida" && acao.updated_at)
    .sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? ""));

  const grouped = concluidas.reduce<Record<string, number>>((acc, acao) => {
    const key = format(parseISO(acao.updated_at as string), "MM/yyyy", { locale: ptBR });
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  let cumulative = 0;
  return Object.entries(grouped).map(([name, value]) => {
    cumulative += value;
    return { name, value: cumulative };
  });
}

function calcProGestao(acoes: AcaoPlano[], eixos?: RefOption[], programas?: RefOption[]) {
  const filtered = acoes.filter((acao) => {
    const text = `${getEixoNome(acao, eixos)} ${getProgramaNome(acao, programas)}`;
    return /pro-?gest[aã]o|governan[cç]a|controle interno|educa[cç][aã]o previdenci[aá]ria/i.test(
      normalizeText(text),
    );
  });

  const total = filtered.length;
  const concluidas = countStatus(filtered, "concluida");
  const emAndamento = countStatus(filtered, "em_andamento");
  const percentual = total
    ? Math.round(filtered.reduce((sum, acao) => sum + (acao.percentual_execucao ?? 0), 0) / total)
    : 0;

  return { total, concluidas, emAndamento, percentual };
}

function getAreaNome(acao: AcaoPlano, areas?: RefOption[]) {
  return (
    (acao.area_id ? areas?.find((area) => area.id === acao.area_id)?.nome : null) ?? "Sem área"
  );
}

function getResponsavelNome(acao: AcaoPlano, usuarios?: RefOption[]) {
  return (
    (acao.responsavel_id
      ? usuarios?.find((usuario) => usuario.id === acao.responsavel_id)?.nome
      : null) ??
    acao.responsavel_nome ??
    "Sem responsável"
  );
}

function getEixoNome(acao: AcaoPlano, eixos?: RefOption[]) {
  return (
    (acao.eixo_id ? eixos?.find((eixo) => eixo.id === acao.eixo_id)?.nome : null) ??
    acao.eixo_estrategico ??
    "Sem eixo"
  );
}

function getProgramaNome(acao: AcaoPlano, programas?: RefOption[]) {
  return (
    (acao.programa_id
      ? programas?.find((programa) => programa.id === acao.programa_id)?.nome
      : null) ??
    acao.programa ??
    "Sem programa"
  );
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
