import { supabase } from "@/integrations/supabase/client";

export const STATUS_KANBAN = [
  "nao_iniciada",
  "em_andamento",
  "concluida",
  "atrasada",
  "cancelada",
] as const;

export type AcaoStatusKanban = (typeof STATUS_KANBAN)[number];

const STATUS_ALIASES: Record<string, AcaoStatusKanban> = {
  nao_iniciada: "nao_iniciada",
  "nao iniciada": "nao_iniciada",
  em_andamento: "em_andamento",
  "em andamento": "em_andamento",
  concluida: "concluida",
  atrasada: "atrasada",
  cancelada: "cancelada",
};

export type AcaoPlano = {
  id: string;
  codigo: string | null;
  titulo: string | null;
  descricao?: string | null;
  plano_anual_id?: string | null;
  eixo_id?: string | null;
  programa_id?: string | null;
  area_id?: string | null;
  responsavel_id: string | null;
  percentual_execucao: number | null;
  responsavel_nome?: string | null;
  eixo_estrategico?: string | null;
  programa?: string | null;
  prazo_final: string | null;
  status: string | null;
};

export async function buscarAcoesPlanoAcao(): Promise<AcaoPlano[]> {
  const { data, error } = await supabase
    .from("acoes")
    .select("*")
    .order("prazo_final", { ascending: true });

  if (error) {
    console.error("[PGA/Plano de Ação] Erro ao consultar ações:", error);
    throw error;
  }

  return data ?? [];
}

export function normalizarStatusAcao(status: string | null | undefined): AcaoStatusKanban {
  const normalized = (status ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return STATUS_ALIASES[normalized] ?? "nao_iniciada";
}
