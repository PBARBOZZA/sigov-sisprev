import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { updateAcao } from "@/lib/acoes.functions";
import { buscarAcoesPlanoAcao, normalizarStatusAcao, STATUS_KANBAN } from "@/lib/acoes-data";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { STATUS_LABELS, prazoCor, fmtDate } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kanban")({
  head: () => ({ meta: [{ title: "Kanban — SIGOV-SISPREV" }] }),
  component: KanbanView,
});

const COLUMNS = STATUS_KANBAN;

function KanbanView() {
  const qc = useQueryClient();
  const { user, canManage, permissionLevel } = useAuth();
  const updateAcaoFn = useServerFn(updateAcao);
  const [dragId, setDragId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["acoes-list"],
    queryFn: buscarAcoesPlanoAcao,
  });

  const { data: apoiadores } = useQuery({
    queryKey: ["acoes-apoiadores-list"],
    queryFn: async () =>
      (await supabase.from("acoes_apoiadores").select("acao_id,usuario_id")).data ?? [],
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateAcaoFn({ data: { id, status: status as any } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
      qc.invalidateQueries({ queryKey: ["minhas-acoes", user?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-acoes"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>;

  function onDrop(col: string) {
    if (dragId) moveMutation.mutate({ id: dragId, status: col });
    setDragId(null);
  }

  function canMoveCard(acao: { id: string; responsavel_id: string | null }) {
    if (canManage) return true;
    if (permissionLevel === "consulta") return false;
    if (permissionLevel === "responsavel") return acao.responsavel_id === user?.id;
    if (permissionLevel === "apoiador") {
      return (apoiadores ?? []).some(
        (apoiador) => apoiador.acao_id === acao.id && apoiador.usuario_id === user?.id,
      );
    }
    return false;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Kanban</h1>
        <p className="text-sm text-muted-foreground">Arraste os cartões entre colunas para alterar o status.</p>
      </div>
      {isError && (
        <Card className="p-4 text-sm text-destructive">
          NÃ£o foi possÃ­vel carregar as aÃ§Ãµes do Kanban.
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const items = (data ?? []).filter((a) => normalizarStatusAcao(a.status) === col);
          return (
            <div key={col} className="min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col)}>
              <div className="flex items-center justify-between mb-2 px-2">
                <p className="text-sm font-semibold">{STATUS_LABELS[col]}</p>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-2 bg-muted/30 p-2 rounded-md min-h-[300px]">
                {items.map((a) => {
                  const status = normalizarStatusAcao(a.status);
                  const pz = prazoCor(a.prazo_final, status);
                  const canMove = canMoveCard(a);
                  return (
                    <Card key={a.id} draggable={canMove}
                      onDragStart={() => { if (canMove) setDragId(a.id); }}
                      className={`p-3 hover:shadow-md transition-shadow ${canMove ? "cursor-grab active:cursor-grabbing" : ""}`}>
                      <Link to="/plano-acao/$id" params={{ id: a.id }} className="block">
                        <p className="text-[10px] font-mono text-muted-foreground">{a.codigo}</p>
                        <p className="text-sm font-medium line-clamp-2">{a.titulo}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate">{(a as any).responsavel?.nome ?? (a as any).responsavel_nome ?? "—"}</span>
                          <span className="font-medium text-primary">{a.percentual_execucao}%</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span className="text-[10px] text-muted-foreground">{fmtDate(a.prazo_final)}</span>
                          {pz.dias !== null && <Badge className={`${pz.color} text-[9px] px-1.5 py-0`}>{pz.label}</Badge>}
                        </div>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
