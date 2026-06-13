import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  apoiadorAcaoSchema,
  createAcaoSchema,
  evidenciaRegistroSchema,
  updateAcaoSchema,
  vincularResponsavelAcaoSchema,
} from "@/lib/security-schemas";
import { isBootstrapAdminEmail } from "@/lib/permissions";

async function getRoles(supabase: any, userId: string, email?: string | null) {
  if (isBootstrapAdminEmail(email)) return ["admin"];

  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Falha ao validar perfil do usuario.");
  return (data ?? []).map((r: { role: string }) => r.role);
}

function isManager(roles: string[]) {
  return roles.includes("admin") || roles.includes("diretoria");
}

function isConsulta(roles: string[]) {
  return roles.includes("consulta") || roles.includes("conselheiro");
}

async function assertManager(supabase: any, userId: string, email?: string | null) {
  const roles = await getRoles(supabase, userId, email);
  if (!isManager(roles)) {
    throw new Error("Apenas administradores ou gestores podem alterar vinculos da acao.");
  }
}

async function isApoiadorDaAcao(supabase: any, userId: string, acaoId: string) {
  const { data, error } = await supabase
    .from("acoes_apoiadores")
    .select("id")
    .eq("acao_id", acaoId)
    .eq("usuario_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Falha ao validar apoiador da acao.");
  return Boolean(data);
}

function assertOnlyAllowedFields(
  patch: Record<string, unknown>,
  allowed: string[],
  message: string,
) {
  const allowedSet = new Set(allowed);
  const blocked = Object.keys(patch).filter((key) => !allowedSet.has(key));
  if (blocked.length > 0) throw new Error(message);
}

async function assertCompletionEvidenceOrJustification(
  supabase: any,
  acaoId: string,
  currentObservacoes: string | null,
  nextObservacoes: string | null | undefined,
) {
  const { count, error } = await supabase
    .from("evidencias")
    .select("id", { count: "exact", head: true })
    .eq("acao_id", acaoId);
  if (error) throw new Error("Falha ao verificar evidencias da acao.");

  const justification = (nextObservacoes ?? currentObservacoes ?? "").trim();
  if ((count ?? 0) === 0 && !justification) {
    throw new Error("Para concluir sem evidencia, informe uma justificativa em Observacoes.");
  }
}

function toAcaoInsert(data: any) {
  return {
    codigo: data.codigo,
    titulo: data.titulo,
    descricao: data.descricao,
    objetivo: data.objetivo,
    programa: data.programa,
    eixo_estrategico: data.eixo_estrategico,
    area_id: data.area_id,
    responsavel_id: data.responsavel_id,
    responsavel_nome: data.responsavel_id ? null : data.responsavel_nome,
    data_inicio: data.data_inicio,
    prazo_final: data.prazo_final,
    status: data.status,
    prioridade: data.prioridade,
    percentual_execucao: data.percentual_execucao,
    periodicidade: data.periodicidade,
    observacoes: data.observacoes,
  };
}

async function assertEvidencePermission(
  supabase: any,
  userId: string,
  acaoId: string,
  email?: string | null,
) {
  const roles = await getRoles(supabase, userId, email);
  const { data: acao, error } = await supabase
    .from("acoes")
    .select("id,responsavel_id")
    .eq("id", acaoId)
    .maybeSingle();

  if (error || !acao) throw new Error("Acao nao encontrada.");
  const isApoiador = await isApoiadorDaAcao(supabase, userId, acaoId);
  if (isConsulta(roles) || (!isManager(roles) && acao.responsavel_id !== userId && !isApoiador)) {
    throw new Error("Seu perfil nao permite anexar evidencias nesta acao.");
  }
}

export const createAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(createAcaoSchema)
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, (context.claims as any)?.email);

    const { data: created, error } = await context.supabase
      .from("acoes")
      .insert(toAcaoInsert(data))
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const updateAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(updateAcaoSchema)
  .handler(async ({ data, context }) => {
    const { id, ...patchData } = data;
    const roles = await getRoles(context.supabase, context.userId, (context.claims as any)?.email);

    const { data: current, error: currentError } = await context.supabase
      .from("acoes")
      .select("id,responsavel_id,data_inicio,prazo_final,observacoes,status")
      .eq("id", id)
      .single();
    if (currentError || !current) throw new Error("Acao nao encontrada.");

    const isResponsavel = current.responsavel_id === context.userId;
    const isApoiador = await isApoiadorDaAcao(context.supabase, context.userId, id);
    const manager = isManager(roles);

    if (isConsulta(roles)) throw new Error("Perfil de consulta nao pode alterar acoes.");

    if (!manager && !isResponsavel && !isApoiador) {
      throw new Error("Voce nao participa desta acao e nao pode altera-la.");
    }

    const nextInicio = patchData.data_inicio ?? current.data_inicio;
    const nextPrazo = patchData.prazo_final ?? current.prazo_final;
    if (nextInicio && nextPrazo && nextInicio > nextPrazo) {
      throw new Error("Prazo final deve ser igual ou posterior a data de inicio.");
    }

    const patch = toAcaoInsert({ ...patchData });
    Object.keys(patch).forEach((key) => {
      if ((patch as Record<string, unknown>)[key] === undefined) {
        delete (patch as Record<string, unknown>)[key];
      }
    });

    if (!manager && isResponsavel) {
      assertOnlyAllowedFields(
        patch,
        [
          "status",
          "prioridade",
          "percentual_execucao",
          "data_inicio",
          "prazo_final",
          "descricao",
          "objetivo",
          "observacoes",
          "periodicidade",
        ],
        "Responsaveis nao podem alterar responsavel, area ou vinculos estrategicos da acao.",
      );
    }

    if (!manager && !isResponsavel && isApoiador) {
      assertOnlyAllowedFields(
        patch,
        ["status", "percentual_execucao", "observacoes"],
        "Apoiadores podem alterar apenas status, percentual e observacoes.",
      );
    }

    if (patch.status === "concluida" && current.status !== "concluida") {
      await assertCompletionEvidenceOrJustification(
        context.supabase,
        id,
        current.observacoes,
        typeof patch.observacoes === "string" ? patch.observacoes : undefined,
      );
    }

    const { error } = await context.supabase.from("acoes").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const vincularResponsavelAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(vincularResponsavelAcaoSchema)
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, (context.claims as any)?.email);

    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("id,nome,status")
      .eq("id", data.responsavel_id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Usuario responsavel nao encontrado.");
    if (profile.status === false) throw new Error("Usuario responsavel esta inativo.");

    const patch: Record<string, string | null> = { responsavel_id: profile.id };
    if (data.atualizar_responsavel_nome) patch.responsavel_nome = profile.nome;

    const { error } = await context.supabase
      .from("acoes")
      .update(patch as any)
      .eq("id", data.acao_id);
    if (error) throw new Error(error.message);

    return { acao_id: data.acao_id, responsavel_id: profile.id, responsavel_nome: profile.nome };
  });

export const adicionarApoiadorAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(apoiadorAcaoSchema)
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, (context.claims as any)?.email);

    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("id,nome,status")
      .eq("id", data.usuario_id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Usuario apoiador nao encontrado.");
    if (profile.status === false) throw new Error("Usuario apoiador esta inativo.");

    const { data: existente, error: existenteError } = await context.supabase
      .from("acoes_apoiadores")
      .select("id")
      .eq("acao_id", data.acao_id)
      .eq("usuario_id", data.usuario_id)
      .limit(1)
      .maybeSingle();
    if (existenteError) throw new Error(existenteError.message);
    if (existente) return { id: existente.id, acao_id: data.acao_id, usuario_id: data.usuario_id };

    const { data: criado, error } = await context.supabase
      .from("acoes_apoiadores")
      .insert({ acao_id: data.acao_id, usuario_id: data.usuario_id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: criado.id, acao_id: data.acao_id, usuario_id: data.usuario_id };
  });

export const removerApoiadorAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(apoiadorAcaoSchema)
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, (context.claims as any)?.email);

    const { error } = await context.supabase
      .from("acoes_apoiadores")
      .delete()
      .eq("acao_id", data.acao_id)
      .eq("usuario_id", data.usuario_id);
    if (error) throw new Error(error.message);

    return { acao_id: data.acao_id, usuario_id: data.usuario_id };
  });

export const registerEvidenceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(evidenciaRegistroSchema)
  .handler(async ({ data, context }) => {
    await assertEvidencePermission(
      context.supabase,
      context.userId,
      data.acao_id,
      (context.claims as any)?.email,
    );

    const observacao = [
      data.link_externo ? `Link externo: ${data.link_externo}` : null,
      data.numero_processo ? `Numero do processo/documento: ${data.numero_processo}` : null,
      data.observacao,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: created, error } = await context.supabase
      .from("evidencias")
      .insert({
        acao_id: data.acao_id,
        usuario_id: context.userId,
        nome_arquivo: data.nome_arquivo,
        caminho_arquivo: data.caminho_arquivo,
        tipo_arquivo: data.tipo_arquivo,
        observacao: observacao || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: created.id };
  });
