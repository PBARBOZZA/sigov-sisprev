import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { normalizarStatusAcao } from "@/lib/acoes-data";
import { isBootstrapAdminEmail } from "@/lib/permissions";

export type Notificacao = Tables<"notificacoes">;

const notificationSelect =
  "id,usuario_id,acao_id,referencia_tipo,referencia_id,tipo,titulo,mensagem,lida,created_at";
const legacyNotificationSelect =
  "id,usuario_id,referencia_tipo,referencia_id,tipo,titulo,mensagem,lida,created_at";

type NotificationSchemaMode = "acao_id" | "legacy";

type AcaoNotificavel = {
  id: string;
  titulo: string | null;
  prazo_final: string | null;
  status: string | null;
  responsavel_id: string | null;
};

type Apoio = {
  acao_id: string;
  usuario_id: string;
};

type Evidencia = {
  acao_id: string;
};

export async function sincronizarNotificacoesInteligentes() {
  const { error } = await supabase.rpc("gerar_notificacoes_inteligentes");
  if (!error) return;

  await gerarNotificacoesPeloDashboard();
}

export async function listarNotificacoes(limit = 50) {
  await sincronizarNotificacoesInteligentes();
  const mode = await getNotificationSchemaMode();

  const { data, error } = await supabase
    .from("notificacoes")
    .select(mode === "acao_id" ? notificationSelect : legacyNotificationSelect)
    .order("lida", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return normalizarNotificacoes(data ?? []);
}

export async function listarResumoNotificacoes() {
  await sincronizarNotificacoesInteligentes();
  const mode = await getNotificationSchemaMode();

  const [{ count, error: countError }, { data, error: listError }] = await Promise.all([
    supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false),
    supabase
      .from("notificacoes")
      .select(mode === "acao_id" ? notificationSelect : legacyNotificationSelect)
      .eq("lida", false)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (countError) throw new Error(countError.message);
  if (listError) throw new Error(listError.message);

  return {
    count: count ?? 0,
    items: normalizarNotificacoes(data ?? []),
  };
}

export async function marcarNotificacaoComoLida(id: string) {
  const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function marcarTodasNotificacoesComoLidas() {
  const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
  if (error) throw new Error(error.message);
}

export function labelTipoNotificacao(tipo: string) {
  const labels: Record<string, string> = {
    acao_vencendo: "Vencimento",
    acao_atrasada: "Atraso",
    evidencia_pendente: "Evidência",
    usuario_inativo: "Usuário",
    acao_vencendo_30: "Vencimento",
  };

  return labels[tipo] ?? "Alerta";
}

async function getNotificationSchemaMode(): Promise<NotificationSchemaMode> {
  const { error } = await supabase.from("notificacoes").select("acao_id").limit(1);
  return error ? "legacy" : "acao_id";
}

function normalizarNotificacoes(rows: any[]): Notificacao[] {
  return rows.map((row) => ({
    ...row,
    acao_id: row.acao_id ?? (row.referencia_tipo === "acao" ? row.referencia_id : null),
  })) as Notificacao[];
}

async function gerarNotificacoesPeloDashboard() {
  const [{ data: userData }, mode] = await Promise.all([
    supabase.auth.getUser(),
    getNotificationSchemaMode(),
  ]);
  const user = userData.user;
  if (!user) return;

  const [{ data: roles }, { data: acoes, error: acoesError }, { data: apoiadores }, { data: evidencias }] =
    await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("acoes").select("id,titulo,prazo_final,status,responsavel_id").order("prazo_final"),
      supabase.from("acoes_apoiadores").select("acao_id,usuario_id"),
      supabase.from("evidencias").select("acao_id"),
    ]);

  if (acoesError) throw new Error(acoesError.message);

  const roleNames = (roles ?? []).map((item) => item.role);
  const isGovernance =
    isBootstrapAdminEmail(user.email) || roleNames.includes("admin") || roleNames.includes("diretoria");
  const apoioIds = new Set(
    ((apoiadores ?? []) as Apoio[])
      .filter((item) => item.usuario_id === user.id)
      .map((item) => item.acao_id),
  );
  const evidenceIds = new Set(((evidencias ?? []) as Evidencia[]).map((item) => item.acao_id));

  const candidates = ((acoes ?? []) as AcaoNotificavel[])
    .filter((acao) => isGovernance || acao.responsavel_id === user.id || apoioIds.has(acao.id))
    .flatMap((acao) => buildActionNotifications(acao, user.id, evidenceIds));

  if (candidates.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("notificacoes")
    .select(mode === "acao_id" ? "tipo,acao_id,referencia_tipo,referencia_id" : "tipo,referencia_tipo,referencia_id")
    .eq("usuario_id", user.id);

  if (existingError) throw new Error(existingError.message);

  const existingKeys = new Set(
    (existing ?? []).map((item: any) =>
      notificationKey(
        item.tipo,
        item.acao_id ?? (item.referencia_tipo === "acao" ? item.referencia_id : null),
      ),
    ),
  );

  const inserts = candidates.filter((item) => !existingKeys.has(notificationKey(item.tipo, item.acao_id)));
  if (inserts.length === 0) return;

  const payload =
    mode === "acao_id"
      ? inserts
      : inserts.map(({ acao_id, ...item }) => ({
          ...item,
          referencia_tipo: "acao",
          referencia_id: acao_id,
        }));

  const { error } = await supabase.from("notificacoes").insert(payload);
  if (error) throw new Error(error.message);
}

function buildActionNotifications(
  acao: AcaoNotificavel,
  usuarioId: string,
  evidenceIds: Set<string>,
) {
  const status = normalizarStatusAcao(acao.status);
  const closed = status === "concluida" || status === "cancelada";
  const title = acao.titulo ?? "Ação sem título";
  const notifications: Array<{
    usuario_id: string;
    acao_id: string;
    referencia_tipo: string;
    referencia_id: string;
    tipo: string;
    titulo: string;
    mensagem: string;
  }> = [];

  if (!closed && acao.prazo_final) {
    const days = daysUntil(acao.prazo_final);
    if (days < 0) {
      notifications.push({
        usuario_id: usuarioId,
        acao_id: acao.id,
        referencia_tipo: "acao",
        referencia_id: acao.id,
        tipo: "acao_atrasada",
        titulo: "Ação atrasada",
        mensagem: `A ação "${title}" está atrasada desde ${formatDate(acao.prazo_final)}.`,
      });
    } else if (days <= 7) {
      notifications.push({
        usuario_id: usuarioId,
        acao_id: acao.id,
        referencia_tipo: "acao",
        referencia_id: acao.id,
        tipo: "acao_vencendo",
        titulo: "Ação vencendo",
        mensagem: `A ação "${title}" vence em ${formatDate(acao.prazo_final)}.`,
      });
    } else if (days <= 30) {
      notifications.push({
        usuario_id: usuarioId,
        acao_id: acao.id,
        referencia_tipo: "acao",
        referencia_id: acao.id,
        tipo: "acao_vencendo_30",
        titulo: "Ação vencendo em 30 dias",
        mensagem: `A ação "${title}" vence em ${formatDate(acao.prazo_final)}.`,
      });
    }
  }

  if (status === "concluida" && !evidenceIds.has(acao.id)) {
    notifications.push({
      usuario_id: usuarioId,
      acao_id: acao.id,
      referencia_tipo: "acao",
      referencia_id: acao.id,
      tipo: "evidencia_pendente",
      titulo: "Evidência pendente",
      mensagem: `A ação concluída "${title}" ainda não possui evidência registrada.`,
    });
  }

  return notifications;
}

function notificationKey(tipo: string, acaoId: string | null) {
  return `${tipo}:${acaoId ?? ""}`;
}

function daysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${value}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
