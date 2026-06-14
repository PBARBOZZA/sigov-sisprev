import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { buscarAcoesPlanoAcao, normalizarStatusAcao, type AcaoPlano } from "@/lib/acoes-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { STATUS_LABELS, fmtDate } from "@/lib/acao-helpers";
import { differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios - SIGOV-SISPREV" }] }),
  component: Relatorios,
});

type RefOption = { id: string; nome: string | null };
type Apoio = { acao_id: string; usuario_id: string };
type Evidencia = {
  id: string;
  acao_id: string | null;
  usuario_id: string | null;
  nome_arquivo: string | null;
  tipo_arquivo: string | null;
  caminho_arquivo: string | null;
  observacao: string | null;
  created_at: string | null;
};
type RelatorioConfig = {
  title: string;
  description: string;
  exportLabel?: string;
  onExport: () => void;
};

function Relatorios() {
  const { user, permissionLevel } = useAuth();
  const canExportAll = permissionLevel === "admin" || permissionLevel === "diretoria";
  const canExportEvidence =
    canExportAll || permissionLevel === "responsavel" || permissionLevel === "apoiador";

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

  const { data: planos } = useQuery({
    queryKey: ["planos-options"],
    queryFn: async () =>
      (await supabase.from("plano_anual").select("id,nome,ano").order("ano")).data ?? [],
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

  const { data: apoiadores } = useQuery({
    queryKey: ["acoes-apoiadores-list"],
    queryFn: async () =>
      (await supabase.from("acoes_apoiadores").select("acao_id,usuario_id")).data ?? [],
  });

  const { data: evidencias, isLoading: isLoadingEvidencias } = useQuery({
    queryKey: ["relatorio-evidencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidencias")
        .select(
          "id,acao_id,usuario_id,nome_arquivo,caminho_arquivo,tipo_arquivo,observacao,created_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Relatórios/Evidências] Erro ao consultar evidências:", error);
        throw error;
      }

      return data ?? [];
    },
  });

  const apoioActionIds = new Set(
    (apoiadores ?? [])
      .filter((apoiador: Apoio) => apoiador.usuario_id === user?.id)
      .map((apoiador: Apoio) => apoiador.acao_id),
  );
  const items =
    canExportAll || permissionLevel === "consulta"
      ? (acoes ?? [])
      : (acoes ?? []).filter(
          (acao) => acao.responsavel_id === user?.id || apoioActionIds.has(acao.id),
        );

  function exportPlanoAcaoCompleto() {
    exportAcoes(
      "relatorio_plano_acao",
      [
        "Código",
        "Título",
        "Plano",
        "Eixo",
        "Programa",
        "Área",
        "Responsável",
        "Prazo",
        "Percentual",
        "Status",
        "Observações",
      ],
      items.map((acao) => [
        acao.codigo,
        acao.titulo,
        getPlanoNome(acao, planos),
        getEixoNome(acao, eixos),
        getProgramaNome(acao, programas),
        getAreaNome(acao, areas),
        getResponsavelNome(acao, usuarios),
        fmtDate(acao.prazo_final),
        acao.percentual_execucao ?? 0,
        getStatusLabel(acao),
        acao.descricao,
      ]),
    );
  }

  function exportAcoesPorResponsavel() {
    const sorted = [...items].sort((a, b) =>
      getResponsavelNome(a, usuarios).localeCompare(getResponsavelNome(b, usuarios)),
    );
    exportAcoes(
      "relatorio_acoes_por_responsavel",
      ["Responsável", "Código", "Título", "Área", "Prazo", "Percentual", "Status"],
      sorted.map((acao) => [
        getResponsavelNome(acao, usuarios),
        acao.codigo,
        acao.titulo,
        getAreaNome(acao, areas),
        fmtDate(acao.prazo_final),
        acao.percentual_execucao ?? 0,
        getStatusLabel(acao),
      ]),
    );
  }

  function exportAcoesPorArea() {
    const sorted = [...items].sort((a, b) =>
      getAreaNome(a, areas).localeCompare(getAreaNome(b, areas)),
    );
    exportAcoes(
      "relatorio_acoes_por_area",
      ["Área", "Código", "Título", "Responsável", "Prazo", "Percentual", "Status"],
      sorted.map((acao) => [
        getAreaNome(acao, areas),
        acao.codigo,
        acao.titulo,
        getResponsavelNome(acao, usuarios),
        fmtDate(acao.prazo_final),
        acao.percentual_execucao ?? 0,
        getStatusLabel(acao),
      ]),
    );
  }

  function exportAcoesAtrasadas() {
    exportAcoes(
      "relatorio_acoes_atrasadas",
      [
        "Código",
        "Título",
        "Responsável",
        "Área",
        "Prazo",
        "Dias em atraso",
        "Percentual",
        "Status",
      ],
      items
        .filter(isAtrasada)
        .map((acao) => [
          acao.codigo,
          acao.titulo,
          getResponsavelNome(acao, usuarios),
          getAreaNome(acao, areas),
          fmtDate(acao.prazo_final),
          getDiasAtraso(acao),
          acao.percentual_execucao ?? 0,
          getStatusLabel(acao),
        ]),
    );
  }

  function exportAcoesConcluidas() {
    exportAcoes(
      "relatorio_acoes_concluidas",
      ["Código", "Título", "Responsável", "Área", "Prazo", "Percentual", "Status"],
      items
        .filter((acao) => normalizarStatusAcao(acao.status) === "concluida")
        .map((acao) => [
          acao.codigo,
          acao.titulo,
          getResponsavelNome(acao, usuarios),
          getAreaNome(acao, areas),
          fmtDate(acao.prazo_final),
          acao.percentual_execucao ?? 0,
          getStatusLabel(acao),
        ]),
    );
  }

  function exportProGestao() {
    exportAcoes(
      "relatorio_pro_gestao",
      [
        "Código",
        "Título",
        "Eixo",
        "Programa",
        "Área",
        "Responsável",
        "Prazo",
        "Percentual",
        "Status",
      ],
      items
        .filter((acao) => isProGestao(acao, eixos, programas))
        .map((acao) => [
          acao.codigo,
          acao.titulo,
          getEixoNome(acao, eixos),
          getProgramaNome(acao, programas),
          getAreaNome(acao, areas),
          getResponsavelNome(acao, usuarios),
          fmtDate(acao.prazo_final),
          acao.percentual_execucao ?? 0,
          getStatusLabel(acao),
        ]),
    );
  }

  function exportEvidencias() {
    if (!canExportEvidence) {
      toast.error("Seu perfil pode exportar apenas relatórios gerais de consulta.");
      return;
    }

    const allowedActionIds = new Set(items.map((acao) => acao.id));
    const rows = (evidencias ?? [])
      .filter(
        (evidencia: Evidencia) => canExportAll || allowedActionIds.has(evidencia.acao_id ?? ""),
      )
      .map((evidencia: Evidencia) => [
        formatAcaoVinculada(evidencia, acoes),
        evidencia.nome_arquivo,
        evidencia.tipo_arquivo,
        evidencia.caminho_arquivo,
        evidencia.observacao,
        evidencia.usuario_id,
        fmtDate(evidencia.created_at),
      ]);

    exportCsv(
      "relatorio_evidencias",
      [
        "Ação vinculada",
        "Nome da evidência",
        "Tipo",
        "Caminho da rede",
        "Observação",
        "usuario_id",
        "Data de cadastro",
      ],
      rows,
    );
  }

  function exportAcoes(filename: string, headers: string[], rows: CsvValue[][]) {
    exportCsv(filename, headers, rows);
  }

  const reports: RelatorioConfig[] = [
    {
      title: "Plano de Ação completo",
      description:
        "Todas as ações com plano, eixo, programa, responsáveis, prazos, status e observações.",
      onExport: exportPlanoAcaoCompleto,
    },
    {
      title: "Ações por responsável",
      description: "Lista agrupada por responsável para acompanhamento de cargas e prazos.",
      onExport: exportAcoesPorResponsavel,
    },
    {
      title: "Ações por área",
      description: "Lista agrupada por área com responsáveis, prazos e situação atual.",
      onExport: exportAcoesPorArea,
    },
    {
      title: "Ações atrasadas",
      description: "Apenas ações com prazo vencido e ainda não concluídas ou canceladas.",
      onExport: exportAcoesAtrasadas,
    },
    {
      title: "Ações concluídas",
      description: "Ações finalizadas, com área, responsável, prazo e percentual registrado.",
      onExport: exportAcoesConcluidas,
    },
    {
      title: "Pró-Gestão",
      description:
        "Ações identificadas por eixo, programa ou título de governança, controle interno ou educação previdenciária.",
      onExport: exportProGestao,
    },
    {
      title: "Relatório de Evidências",
      description:
        "Índice das evidências registradas, com ação vinculada, caminho de rede, usuário e data.",
      onExport: exportEvidencias,
    },
  ];

  const loading = isLoading || isLoadingEvidencias;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileBarChart className="h-6 w-6 text-primary" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">
          Exportações CSV para homologação, auditoria e acompanhamento do PGA.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.title} className="p-5">
            <h3 className="font-semibold">{report.title}</h3>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">{report.description}</p>
            <Button onClick={report.onExport} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar CSV
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

type CsvValue = string | number | null | undefined;

function exportCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  if (rows.length === 0) {
    toast.error("Sem dados para exportar");
    return;
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exportado");
}

function getPlanoNome(acao: AcaoPlano, planos?: Array<RefOption & { ano?: number | null }>) {
  const plano = acao.plano_anual_id
    ? planos?.find((item) => item.id === acao.plano_anual_id)
    : null;
  if (!plano) return "";
  return plano.ano ? `${plano.nome ?? "Plano"} ${plano.ano}` : (plano.nome ?? "");
}

function getEixoNome(acao: AcaoPlano, eixos?: RefOption[]) {
  return (
    (acao.eixo_id ? eixos?.find((eixo) => eixo.id === acao.eixo_id)?.nome : null) ??
    acao.eixo_estrategico ??
    ""
  );
}

function getProgramaNome(acao: AcaoPlano, programas?: RefOption[]) {
  return (
    (acao.programa_id
      ? programas?.find((programa) => programa.id === acao.programa_id)?.nome
      : null) ??
    acao.programa ??
    ""
  );
}

function getAreaNome(acao: AcaoPlano, areas?: RefOption[]) {
  return (acao.area_id ? areas?.find((area) => area.id === acao.area_id)?.nome : null) ?? "";
}

function getResponsavelNome(acao: AcaoPlano, usuarios?: RefOption[]) {
  return (
    (acao.responsavel_id
      ? usuarios?.find((usuario) => usuario.id === acao.responsavel_id)?.nome
      : null) ??
    acao.responsavel_nome ??
    ""
  );
}

function getStatusLabel(acao: AcaoPlano) {
  const status = normalizarStatusAcao(acao.status);
  return STATUS_LABELS[status] ?? status;
}

function isAtrasada(acao: AcaoPlano) {
  if (!acao.prazo_final || isClosed(acao)) return false;
  return differenceInDays(parseISO(acao.prazo_final), new Date()) < 0;
}

function getDiasAtraso(acao: AcaoPlano) {
  if (!acao.prazo_final) return 0;
  return Math.max(Math.abs(differenceInDays(parseISO(acao.prazo_final), new Date())), 0);
}

function isClosed(acao: AcaoPlano) {
  const status = normalizarStatusAcao(acao.status);
  return status === "concluida" || status === "cancelada";
}

function isProGestao(acao: AcaoPlano, eixos?: RefOption[], programas?: RefOption[]) {
  const text = normalizeText(
    `${acao.titulo ?? ""} ${getEixoNome(acao, eixos)} ${getProgramaNome(acao, programas)}`,
  );
  return /pro-?gestao|governanca|controle interno|educacao previdenciaria/.test(text);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatAcaoVinculada(evidencia: Evidencia, acoes?: AcaoPlano[]) {
  const acao = acoes?.find((item) => item.id === evidencia.acao_id);
  if (!acao) return evidencia.acao_id ?? "";
  return [acao.codigo, acao.titulo].filter(Boolean).join(" - ");
}
