import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createAcaoSchema,
  evidenciaUploadSchema,
  updateAcaoSchema,
  type EvidenciaUploadInput,
} from "@/lib/security-schemas";
import { isBootstrapAdminEmail } from "@/lib/permissions";

const registerEvidenceSchema = evidenciaUploadSchema.extend({
  caminho_arquivo: z.string().min(1).max(260),
});

async function getRoles(supabase: any, userId: string, email?: string | null) {
  if (isBootstrapAdminEmail(email)) return ["admin"];

  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Falha ao validar perfil do usuario.");
  return (data ?? []).map((r: { role: string }) => r.role);
}

function isManager(roles: string[]) {
  return roles.includes("admin") || roles.includes("diretoria");
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

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 140);
}

async function assertEvidencePermission(supabase: any, userId: string, acaoId: string, email?: string | null) {
  const roles = await getRoles(supabase, userId, email);
  const { data: acao, error } = await supabase
    .from("acoes")
    .select("id,responsavel_id")
    .eq("id", acaoId)
    .maybeSingle();

  if (error || !acao) throw new Error("Acao nao encontrada.");
  if (!isManager(roles) && acao.responsavel_id !== userId) {
    throw new Error("Apenas responsaveis, diretoria ou administradores podem anexar evidencias.");
  }
}

function validateEvidencePath(input: EvidenciaUploadInput, userId: string, path: string) {
  const expectedPrefix = `${userId}/${input.acao_id}/`;
  if (!path.startsWith(expectedPrefix)) {
    throw new Error("Caminho de evidencia invalido.");
  }
}

export const createAcao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(createAcaoSchema)
  .handler(async ({ data, context }) => {
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

    const { data: current, error: currentError } = await context.supabase
      .from("acoes")
      .select("data_inicio,prazo_final")
      .eq("id", id)
      .single();
    if (currentError || !current) throw new Error("Acao nao encontrada.");

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

    const { error } = await context.supabase.from("acoes").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const prepareEvidenceUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(evidenciaUploadSchema)
  .handler(async ({ data, context }) => {
    await assertEvidencePermission(context.supabase, context.userId, data.acao_id, (context.claims as any)?.email);

    const safeName = sanitizeFileName(data.nome_arquivo);
    if (!safeName) throw new Error("Nome do arquivo invalido.");

    const path = `${context.userId}/${data.acao_id}/${Date.now()}-${safeName}`;
    return { path };
  });

export const registerEvidenceUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(registerEvidenceSchema)
  .handler(async ({ data, context }) => {
    await assertEvidencePermission(context.supabase, context.userId, data.acao_id, (context.claims as any)?.email);
    validateEvidencePath(data, context.userId, data.caminho_arquivo);

    const { error } = await context.supabase.from("evidencias").insert({
      acao_id: data.acao_id,
      usuario_id: context.userId,
      nome_arquivo: data.nome_arquivo,
      caminho_arquivo: data.caminho_arquivo,
      tipo_arquivo: data.tipo_arquivo,
      observacao: data.observacao,
    });

    if (error) {
      await context.supabase.storage.from("evidencias").remove([data.caminho_arquivo]);
      throw new Error(error.message);
    }

    return { path: data.caminho_arquivo };
  });
