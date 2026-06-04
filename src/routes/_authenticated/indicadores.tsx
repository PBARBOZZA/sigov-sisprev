import { RequireRole } from "@/components/require-role";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores — SIGOV-SISPREV" }] }),
  component: () => (<RequireRole require="manage"><Indicadores /></RequireRole>),
});

function Indicadores() {
  const { data, isLoading } = useQuery({
    queryKey: ["indicadores-list"],
    queryFn: async () => (await supabase.from("indicadores").select("*, area:areas(nome)").order("nome")).data ?? [],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Gauge className="h-6 w-6 text-primary" /> Indicadores</h1>
        <p className="text-sm text-muted-foreground">Indicadores institucionais de desempenho.</p>
      </div>
      {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> :
        (data ?? []).length === 0 ? (
          <Card className="p-12 text-center">
            <Gauge className="h-12 w-12 mx-auto text-primary/40 mb-3" />
            <p className="font-medium">Nenhum indicador cadastrado ainda</p>
            <p className="text-sm text-muted-foreground mt-1">A estrutura está preparada. Exemplos: % de ações concluídas, tempo médio de concessão, % de cumprimento de prazos, satisfação dos segurados, % Pró-Gestão atendido.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.map((i: any) => (
              <Card key={i.id} className="p-4">
                <p className="font-semibold">{i.nome}</p>
                <p className="text-xs text-muted-foreground">{i.area?.nome ?? "—"} · {i.periodicidade ?? "—"}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div><p className="text-2xl font-bold text-primary">{i.resultado_atual ?? "—"} {i.unidade_medida ?? ""}</p><p className="text-xs text-muted-foreground">Meta: {i.meta ?? "—"}</p></div>
                  <Badge variant={i.status ? "default" : "secondary"}>{i.status ? "Ativo" : "Inativo"}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
