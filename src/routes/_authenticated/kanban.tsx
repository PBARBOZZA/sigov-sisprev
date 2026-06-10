import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { updateAcao } from "@/lib/acoes.functions";
import { buscarMinhasAcoes } from "@/lib/minhas-acoes-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { STATUS_LABELS, prazoCor, fmtDate } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kanban")({
  head: () => ({ meta: [{ title: "Kanban — SIGOV-SISPREV" }] }),
  component: KanbanView,
});

const COLUMNS = ["nao_iniciada", "em_andamento", "concluida", "atrasada", "cancelada"] as const;

function KanbanView() {
  const qc = useQueryClient();
  const { user, canManage } = useAuth();
  const updateAcaoFn = useServerFn(updateAcao);
  const [dragId, setDragId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["minhas-acoes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const userId = user?.id;
      if (!userId) return [];
      return buscarMinhasAcoes(userId);
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateAcaoFn({ data: { id, status: status as any } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["minhas-acoes", user?.id] });
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
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
          const items = (data ?? []).filter((a) => a.status === col);
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
                  const pz = prazoCor(a.prazo_final, a.status);
                  return (
                    <Card key={a.id} draggable={canManage || a.responsavel_id === user?.id}
                      onDragStart={() => { if (canManage || a.responsavel_id === user?.id) setDragId(a.id); }}
                      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
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
