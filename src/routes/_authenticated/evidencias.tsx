import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download } from "lucide-react";
import { fmtDate } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/evidencias")({
  head: () => ({ meta: [{ title: "Evidências — SIGOV-SISPREV" }] }),
  component: Evidencias,
});

function Evidencias() {
  const { data, isLoading } = useQuery({
    queryKey: ["evidencias-all"],
    queryFn: async () => (await supabase.from("evidencias")
      .select("*, usuario:profiles(nome), acao:acoes(id,titulo,codigo)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  async function download(path: string, nome: string) {
    const { data, error } = await supabase.storage.from("evidencias").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Erro ao gerar link"); return; }
    const a = document.createElement("a"); a.href = data.signedUrl; a.download = nome; a.click();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Evidências</h1>
        <p className="text-sm text-muted-foreground">Todos os arquivos comprobatórios anexados às ações.</p>
      </div>
      <Card>
        {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> :
          (data ?? []).length === 0 ? <p className="text-center text-sm text-muted-foreground p-12">Nenhuma evidência cadastrada.</p> : (
            <ul className="divide-y">
              {data?.map((e: any) => (
                <li key={e.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.acao ? <Link to="/plano-acao/$id" params={{ id: e.acao.id }} className="hover:underline">{e.acao.codigo} · {e.acao.titulo}</Link> : "Ação removida"}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.usuario?.nome ?? "—"} · {fmtDate(e.created_at)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => download(e.caminho_arquivo, e.nome_arquivo)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </div>
  );
}
