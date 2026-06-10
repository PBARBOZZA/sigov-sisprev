import { supabase } from "@/integrations/supabase/client";

type NomeRef = { nome: string | null };
export type PapelUsuario = "Respons\u00c3\u00a1vel" | "Apoiador";

export type AcaoUsuario = {
  id: string;
  codigo: string;
  titulo: string;
  eixo_estrategico: string | null;
  programa: string | null;
  status: string;
  percentual_execucao: number;
  prazo_final: string | null;
  responsavel_id: string | null;
  responsavel_nome?: string | null;
  area?: NomeRef | null;
  eixo?: NomeRef | null;
  programa_ref?: NomeRef | null;
  papel: PapelUsuario;
};

const MINHAS_ACOES_SELECT = "*, area:areas(nome), eixo:pga_eixos(nome), programa_ref:pga_programas(nome)";

export async function buscarMinhasAcoes(userId: string): Promise<AcaoUsuario[]> {
  const { data: responsavelData, error: responsavelError } = await supabase
    .from("acoes")
    .select(MINHAS_ACOES_SELECT)
    .eq("responsavel_id", userId)
    .order("prazo_final", { ascending: true });
  if (responsavelError) throw responsavelError;

  const { data: apoioData, error: apoioError } = await supabase
    .from("acoes_apoiadores")
    .select("acao_id")
    .eq("usuario_id", userId);
  if (apoioError) throw apoioError;

  const apoioIds = Array.from(new Set((apoioData ?? []).map((item) => item.acao_id)));
  const apoiadorData = apoioIds.length ? await buscarAcoesApoiador(apoioIds) : [];

  return combinarAcoes((responsavelData ?? []) as Omit<AcaoUsuario, "papel">[], apoiadorData);
}

async function buscarAcoesApoiador(acaoIds: string[]) {
  const { data, error } = await supabase
    .from("acoes")
    .select(MINHAS_ACOES_SELECT)
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
  responsavelData.forEach((acao) =>
    map.set(acao.id, { ...acao, papel: "Respons\u00c3\u00a1vel" }),
  );
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
