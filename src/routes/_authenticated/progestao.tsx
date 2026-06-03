import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progestao")({
  head: () => ({ meta: [{ title: "Pró-Gestão RPPS — SIGOV-SISPREV" }] }),
  component: ProGestao,
});

const SIT_LABELS: Record<string, string> = {
  atendido: "Atendido", parcial: "Parcialmente atendido",
  nao_atendido: "Não atendido", em_implantacao: "Em implantação",
};
const SIT_COLORS: Record<string, string> = {
  atendido: "bg-success/15 text-success",
  parcial: "bg-warning/20 text-warning-foreground",
  nao_atendido: "bg-destructive/15 text-destructive",
  em_implantacao: "bg-info/15 text-info",
};

function ProGestao() {
  const { data, isLoading } = useQuery({
    queryKey: ["progestao-list"],
    queryFn: async () => (await supabase.from("requisitos_progestao").select("*").order("dimensao")).data ?? [],
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  const total = data?.length ?? 0;
  const atendidos = (data ?? []).filter((r) => r.situacao === "atendido").length;
  const parcial = (data ?? []).filter((r) => r.situacao === "parcial").length;
  const naoAt = (data ?? []).filter((r) => r.situacao === "nao_atendido").length;
  const conform = total ? Math.round((atendidos / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-primary" /> Pró-Gestão RPPS</h1>
        <p className="text-sm text-muted-foreground">Controle dos requisitos do Programa de Certificação Institucional dos RPPS.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total de requisitos</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-success">{atendidos}</p><p className="text-xs text-muted-foreground">Atendidos</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-warning-foreground">{parcial}</p><p className="text-xs text-muted-foreground">Parcialmente</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-destructive">{naoAt}</p><p className="text-xs text-muted-foreground">Não atendidos</p></Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Percentual de conformidade</p>
          <p className="text-3xl font-bold text-primary">{conform}%</p>
        </div>
        <Progress value={conform} />
      </Card>

      <Card className="p-12 text-center">
        <Award className="h-12 w-12 mx-auto text-primary/40 mb-3" />
        <p className="font-medium">Módulo preparado para implantação</p>
        <p className="text-sm text-muted-foreground mt-1">
          A estrutura de banco e tela está pronta. Os requisitos do manual Pró-Gestão serão cadastrados em uma próxima etapa.
        </p>
      </Card>

      {(data ?? []).length > 0 && (
        <Card>
          <ul className="divide-y">
            {data?.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.item}</p>
                  <p className="text-xs text-muted-foreground">{r.dimensao ?? "—"}</p>
                </div>
                <Badge className={SIT_COLORS[r.situacao]}>{SIT_LABELS[r.situacao]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
