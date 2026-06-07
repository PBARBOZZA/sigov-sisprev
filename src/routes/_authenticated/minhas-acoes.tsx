import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ComponentType, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, fmtDate, prazoCor } from "@/lib/acao-helpers";
import { differenceInDays, parseISO } from "date-fns";
import {
  AlarmClock,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Loader2,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/minhas-acoes")({
  head: () => ({ meta: [{ title: "Minhas Ações — SIGOV-SISPREV" }] }),
  component: MinhasAcoes,
});

type NomeRef = { nome: string | null };
type PapelUsuario = "Responsável" | "Apoiador";
type FiltroRapido = "todas" | "responsavel" | "apoiador" | "atrasadas" | "vencendo" | "concluidas";

type AcaoUsuario = {
  id: string;
  codigo: string;
  titulo: string;
  eixo_estrategico: string | null;
  programa: string | null;
  status: string;
  percentual_execucao: number;
  prazo_final: string | null;
  responsavel_id: string | null;
  area?: NomeRef | null;
  eixo?: NomeRef | null;
  programa_ref?: NomeRef | null;
  papel: PapelUsuario;
};

const filtros: { value: FiltroRapido; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "responsavel", label: "Sou responsável" },
  { value: "apoiador", label: "Sou apoiador" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "vencendo", label: "Vencendo em breve" },
  { value: "concluidas", label: "Concluídas" },
];

function MinhasAcoes() {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState<FiltroRapido>("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["minhas-acoes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const userId = user?.id;
      if (!userId) return [];

      const select = "*, area:areas(nome), eixo:pga_eixos(nome), programa_ref:pga_programas(nome)";

      const { data: responsavelData, error: responsavelError } = await supabase
        .from("acoes")
        .select(select)
        .eq("responsavel_id", userId)
        .order("prazo_final", { ascending: true });
      if (responsavelError) throw responsavelError;

      const { data: apoioData, error: apoioError } = await supabase
        .from("acoes_apoiadores")
        .select("acao_id")
        .eq("usuario_id", userId);
      if (apoioError) throw apoioError;

      const apoioIds = Array.from(new Set((apoioData ?? []).map((item) => item.acao_id)));
      const apoiadorData = apoioIds.length ? await buscarAcoesApoiador(apoioIds, select) : [];

      return combinarAcoes((responsavelData ?? []) as Omit<AcaoUsuario, "papel">[], apoiadorData);
    },
  });

  const minhasAcoes = data ?? [];
  const filtradas = minhasAcoes.filter((acao) => matchesFiltro(acao, filtro));
  const resumo = {
    total: minhasAcoes.length,
    emAndamento: minhasAcoes.filter((acao) => acao.status === "em_andamento").length,
    atrasadas: minhasAcoes.filter(isAtrasada).length,
    vencendo: minhasAcoes.filter(isVencendoEm30Dias).length,
    concluidas: minhasAcoes.filter((acao) => acao.status === "concluida").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Minhas Ações</h1>
        <p className="text-sm text-muted-foreground">
          Ações em que você é responsável principal ou apoiador.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <ResumoCard label="Total de minhas ações" value={resumo.total} icon={ListChecks} />
        <ResumoCard label="Em andamento" value={resumo.emAndamento} icon={TrendingUp} tone="info" />
        <ResumoCard
          label="Atrasadas"
          value={resumo.atrasadas}
          icon={AlertTriangle}
          tone="destructive"
        />
        <ResumoCard
          label="Vencendo 30 dias"
          value={resumo.vencendo}
          icon={AlarmClock}
          tone="warning"
        />
        <ResumoCard
          label="Concluídas"
          value={resumo.concluidas}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {filtros.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={filtro === item.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltro(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <ListChecks className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhuma ação encontrada para este filtro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="text-left">
                  <Th>Código</Th>
                  <Th>Título</Th>
                  <Th>Eixo</Th>
                  <Th>Programa</Th>
                  <Th>Área</Th>
                  <Th>Papel</Th>
                  <Th>Status</Th>
                  <Th>%</Th>
                  <Th>Prazo</Th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((acao) => {
                  const prazo = prazoCor(acao.prazo_final, acao.status);
                  return (
                    <tr key={acao.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="px-3 py-2 font-mono text-xs">{acao.codigo}</td>
                      <td className="px-3 py-2">
                        <Link
                          to="/plano-acao/$id"
                          params={{ id: acao.id }}
                          className="font-medium hover:underline"
                        >
                          {acao.titulo}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs">{getEixoNome(acao)}</td>
                      <td className="px-3 py-2 text-xs">{getProgramaNome(acao)}</td>
                      <td className="px-3 py-2 text-xs">{acao.area?.nome ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={acao.papel === "Responsável" ? "default" : "outline"}>
                          {acao.papel}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{STATUS_LABELS[acao.status] ?? acao.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">{acao.percentual_execucao}%</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span>{fmtDate(acao.prazo_final)}</span>
                          {prazo.dias !== null && (
                            <Badge className={`${prazo.color} text-[10px]`}>{prazo.label}</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

async function buscarAcoesApoiador(acaoIds: string[], select: string) {
  const { data, error } = await supabase
    .from("acoes")
    .select(select)
    .in("id", acaoIds)
    .order("prazo_final", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Omit<AcaoUsuario, "papel">[];
}

function combinarAcoes(
  responsavelData: Omit<AcaoUsuario, "papel">[],
  apoiadorData: Omit<AcaoUsuario, "papel">[],
) {
  const map = new Map<string, AcaoUsuario>();
  responsavelData.forEach((acao) => map.set(acao.id, { ...acao, papel: "Responsável" }));
  apoiadorData.forEach((acao) => {
    if (!map.has(acao.id)) map.set(acao.id, { ...acao, papel: "Apoiador" });
  });
  return Array.from(map.values()).sort(comparePrazo);
}

function comparePrazo(a: AcaoUsuario, b: AcaoUsuario) {
  if (!a.prazo_final && !b.prazo_final) return a.codigo.localeCompare(b.codigo);
  if (!a.prazo_final) return 1;
  if (!b.prazo_final) return -1;
  return a.prazo_final.localeCompare(b.prazo_final);
}

function matchesFiltro(acao: AcaoUsuario, filtro: FiltroRapido) {
  if (filtro === "responsavel") return acao.papel === "Responsável";
  if (filtro === "apoiador") return acao.papel === "Apoiador";
  if (filtro === "atrasadas") return isAtrasada(acao);
  if (filtro === "vencendo") return isVencendoEm30Dias(acao);
  if (filtro === "concluidas") return acao.status === "concluida";
  return true;
}

function isAtrasada(acao: AcaoUsuario) {
  if (!acao.prazo_final || acao.status === "concluida" || acao.status === "cancelada") return false;
  return differenceInDays(parseISO(acao.prazo_final), new Date()) < 0;
}

function isVencendoEm30Dias(acao: AcaoUsuario) {
  if (!acao.prazo_final || acao.status === "concluida" || acao.status === "cancelada") return false;
  const dias = differenceInDays(parseISO(acao.prazo_final), new Date());
  return dias >= 0 && dias <= 30;
}

function getEixoNome(acao: AcaoUsuario) {
  return acao.eixo?.nome ?? acao.eixo_estrategico ?? "Sem eixo";
}

function getProgramaNome(acao: AcaoUsuario) {
  return acao.programa_ref?.nome ?? acao.programa ?? "Sem programa";
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}

function ResumoCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: "primary" | "info" | "success" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    info: "border-info/25 bg-info/15 text-info",
    success: "border-success/25 bg-success/15 text-success",
    warning: "border-warning/30 bg-warning/20 text-warning-foreground",
    destructive: "border-destructive/25 bg-destructive/15 text-destructive",
  };
  return (
    <Card className="p-4">
      <div className={`mb-2 grid h-8 w-8 place-items-center rounded-md border ${toneMap[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
