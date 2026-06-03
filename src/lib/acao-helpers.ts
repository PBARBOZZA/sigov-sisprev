import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const STATUS_LABELS: Record<string, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

export const STATUS_COLORS: Record<string, string> = {
  nao_iniciada: "bg-muted text-muted-foreground border-border",
  em_andamento: "bg-info/10 text-info border-info/30",
  concluida: "bg-success/10 text-success border-success/30",
  atrasada: "bg-destructive/10 text-destructive border-destructive/30",
  cancelada: "bg-muted text-muted-foreground border-border",
};

export const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};

export const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-info/10 text-info",
  alta: "bg-warning/20 text-warning-foreground",
  critica: "bg-destructive/10 text-destructive",
};

export const EIXOS = ["Controles Internos", "Governança Corporativa", "Educação Previdenciária"];

export const PROGRAMAS = [
  "Programa de Fortalecimento do Controle Interno",
  "Programa de Governança, Integridade e Modernização Administrativa",
  "Programa de Educação Previdenciária",
];

export function prazoCor(prazo: string | null, status: string): { color: string; label: string; dias: number | null } {
  if (status === "concluida") return { color: "bg-muted text-muted-foreground", label: "Concluído", dias: null };
  if (!prazo) return { color: "bg-muted text-muted-foreground", label: "Sem prazo", dias: null };
  const dias = differenceInDays(parseISO(prazo), new Date());
  if (dias < 0) return { color: "bg-foreground text-background", label: `${Math.abs(dias)}d atrasado`, dias };
  if (dias < 7) return { color: "bg-destructive text-destructive-foreground", label: `${dias}d`, dias };
  if (dias < 15) return { color: "bg-warning text-warning-foreground", label: `${dias}d`, dias };
  if (dias < 30) return { color: "bg-info/20 text-info", label: `${dias}d`, dias };
  return { color: "bg-success/15 text-success", label: `${dias}d`, dias };
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
}
