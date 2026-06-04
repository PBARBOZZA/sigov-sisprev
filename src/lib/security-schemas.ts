import { z } from "zod";

export const APP_ROLES = ["admin", "diretoria", "responsavel", "conselheiro"] as const;
export const ACAO_STATUS = ["nao_iniciada", "em_andamento", "concluida", "atrasada", "cancelada"] as const;
export const ACAO_PRIORIDADES = ["baixa", "media", "alta", "critica"] as const;

export const MAX_EVIDENCIA_BYTES = 10 * 1024 * 1024;
export const EVIDENCIA_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((value) => value || null);

const requiredText = (label: string, min: number, max: number) =>
  z.string({ required_error: `${label} e obrigatorio.` }).trim().min(min, `${label} e obrigatorio.`).max(max);

const optionalUuid = z.string().uuid().optional().nullable().transform((value) => value || null);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Data invalida.");

const optionalDate = z.preprocess(
  (value) => (value === "" ? null : value),
  dateString.optional().nullable().transform((value) => value || null),
);

export const createUsuarioSchema = z.object({
  nome: requiredText("Nome", 2, 120),
  email: z.string().trim().email("E-mail invalido.").max(255),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.").max(72),
  cargo: optionalText(120),
  area_id: optionalUuid,
  role: z.enum(APP_ROLES),
  status: z.boolean().default(true),
});

export const updateUsuarioSchema = z.object({
  id: z.string().uuid(),
  nome: requiredText("Nome", 2, 120).optional(),
  cargo: optionalText(120),
  area_id: optionalUuid,
  role: z.enum(APP_ROLES).optional(),
  status: z.boolean().optional(),
});

const acaoBaseSchema = z.object({
  codigo: requiredText("Codigo", 1, 40),
  titulo: requiredText("Titulo", 3, 240),
  descricao: optionalText(2000),
  objetivo: optionalText(2000),
  programa: optionalText(240),
  eixo_estrategico: optionalText(160),
  area_id: z.string().uuid("Area invalida."),
  responsavel_id: optionalUuid,
  responsavel_nome: optionalText(160),
  data_inicio: optionalDate,
  prazo_final: optionalDate,
  status: z.enum(ACAO_STATUS).default("nao_iniciada"),
  prioridade: z.enum(ACAO_PRIORIDADES).default("media"),
  percentual_execucao: z.coerce.number().int().min(0).max(100).default(0),
  periodicidade: optionalText(40),
  observacoes: optionalText(3000),
});

export const createAcaoSchema = acaoBaseSchema
  .superRefine((data, ctx) => {
    if (!data.responsavel_id && !data.responsavel_nome) {
      ctx.addIssue({ code: "custom", path: ["responsavel_id"], message: "Informe um responsavel." });
    }
    if (data.data_inicio && data.prazo_final && data.data_inicio > data.prazo_final) {
      ctx.addIssue({ code: "custom", path: ["prazo_final"], message: "Prazo final deve ser igual ou posterior a data de inicio." });
    }
  });

export const updateAcaoSchema = acaoBaseSchema
  .partial()
  .extend({ id: z.string().uuid() })
  .superRefine((data, ctx) => {
    if (data.data_inicio && data.prazo_final && data.data_inicio > data.prazo_final) {
      ctx.addIssue({ code: "custom", path: ["prazo_final"], message: "Prazo final deve ser igual ou posterior a data de inicio." });
    }
  });

export const evidenciaUploadSchema = z.object({
  acao_id: z.string().uuid(),
  nome_arquivo: requiredText("Nome do arquivo", 1, 180).refine((value) => !/[\\/:*?"<>|]/.test(value), "Nome do arquivo invalido."),
  tipo_arquivo: z.enum(EVIDENCIA_MIME_TYPES, { errorMap: () => ({ message: "Tipo de arquivo nao permitido." }) }),
  tamanho: z.number().int().positive().max(MAX_EVIDENCIA_BYTES, "Arquivo acima do limite de 10 MB."),
  observacao: optionalText(1000),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
export type CreateAcaoInput = z.infer<typeof createAcaoSchema>;
export type UpdateAcaoInput = z.infer<typeof updateAcaoSchema>;
export type EvidenciaUploadInput = z.infer<typeof evidenciaUploadSchema>;
