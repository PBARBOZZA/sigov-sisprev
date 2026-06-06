import { RequireRole } from "@/components/require-role";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { STATUS_LABELS, fmtDate } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — SIGOV-SISPREV" }] }),
  component: () => (<RequireRole require="manage"><Relatorios /></RequireRole>),
});

function Relatorios() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-acoes"],
    queryFn: async () => (await supabase
      .from("acoes")
      .select("*, area:areas(nome), responsavel:profiles!acoes_responsavel_id_fkey(nome), plano:plano_anual(id,ano,nome), eixo:pga_eixos(id,nome,codigo), programa_ref:pga_programas(id,nome,codigo)")
      .order("codigo")).data ?? [],
  });

  function exportCSV() {
    if (!data || data.length === 0) { toast.error("Sem dados para exportar"); return; }
    const headers = ["Plano Anual", "Eixo", "Programa", "Código", "Título", "Área", "Responsável", "Status", "Prioridade", "% Execução", "Prazo Final"];
    const rows = data.map((a: any) => [
      getPlanoNome(a), getEixoNome(a), getProgramaNome(a),
      a.codigo, a.titulo, a.area?.nome ?? "", a.responsavel?.nome ?? a.responsavel_nome ?? "",
      STATUS_LABELS[a.status], a.prioridade, a.percentual_execucao, fmtDate(a.prazo_final),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `plano-acao-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileBarChart className="h-6 w-6 text-primary" /> Relatórios</h1>
        <p className="text-sm text-muted-foreground">Exportações e relatórios consolidados.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="p-5">
          <h3 className="font-semibold">Plano de Ação completo</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Todas as ações com responsáveis, prazos e percentuais.</p>
          <Button onClick={exportCSV} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Exportar CSV
          </Button>
        </Card>
        {["Ações por responsável", "Ações por área", "Ações atrasadas", "Ações concluídas", "Pró-Gestão"].map((label) => (
          <Card key={label} className="p-5 opacity-70">
            <h3 className="font-semibold">{label}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Disponível em breve.</p>
            <Button disabled className="w-full" variant="outline">Em breve</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function getPlanoNome(acao: any) {
  return acao.plano?.nome ?? "";
}

function getEixoNome(acao: any) {
  return acao.eixo?.nome ?? acao.eixo_estrategico ?? "";
}

function getProgramaNome(acao: any) {
  return acao.programa_ref?.nome ?? acao.programa ?? "";
}
