import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Filter } from "lucide-react";
import { STATUS_LABELS, PRIORIDADE_LABELS, EIXOS, PROGRAMAS, PERIODICIDADES, fmtDate, prazoCor } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plano-acao/")({
  head: () => ({ meta: [{ title: "Plano de Ação — SIGOV-SISPREV" }] }),
  component: PlanoAcao,
});

function PlanoAcao() {
  const { canManage } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ q: "", status: "all", eixo: "all", area: "all", responsavel: "all" });
  const [open, setOpen] = useState(false);

  const { data: acoes, isLoading } = useQuery({
    queryKey: ["acoes-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("acoes")
        .select("*, area:areas(id,nome), responsavel:profiles!acoes_responsavel_id_fkey(id,nome)")
        .order("prazo_final", { ascending: true });
      return data ?? [];
    },
  });

  const { data: areas } = useQuery({
    queryKey: ["areas-options"],
    queryFn: async () => (await supabase.from("areas").select("id,nome").order("nome")).data ?? [],
  });

  const { data: usuarios } = useQuery({
    queryKey: ["usuarios-options"],
    queryFn: async () => (await supabase.from("profiles").select("id,nome").order("nome")).data ?? [],
  });

  const filtered = (acoes ?? []).filter((a) => {
    if (filters.q && !`${a.titulo} ${a.codigo} ${a.descricao ?? ""} ${a.responsavel_nome ?? ""}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.status !== "all" && a.status !== filters.status) return false;
    if (filters.eixo !== "all" && a.eixo_estrategico !== filters.eixo) return false;
    if (filters.area !== "all" && a.area_id !== filters.area) return false;
    if (filters.responsavel !== "all") {
      const nome = (a as any).responsavel?.nome ?? a.responsavel_nome ?? "";
      if (nome !== filters.responsavel) return false;
    }
    return true;
  });

  const responsavelOptions = Array.from(new Set((acoes ?? []).map((a) => (a as any).responsavel?.nome ?? a.responsavel_nome).filter(Boolean))) as string[];

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("acoes").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação criada com sucesso");
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-acoes"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => f.get(k)?.toString().trim() || null;
    const titulo = get("titulo");
    const area_id = get("area");
    const status = get("status") || "nao_iniciada";
    const responsavel_id = get("responsavel");
    const responsavel_nome = get("responsavel_nome");
    if (!titulo || !area_id || !status || (!responsavel_id && !responsavel_nome)) {
      toast.error("Título, Área, Status e Responsável são obrigatórios.");
      return;
    }
    createMutation.mutate({
      codigo: get("codigo"),
      titulo,
      descricao: get("descricao"),
      objetivo: get("objetivo"),
      programa: get("programa"),
      eixo_estrategico: get("eixo"),
      area_id,
      responsavel_id,
      responsavel_nome: responsavel_id ? null : responsavel_nome,
      data_inicio: get("data_inicio"),
      prazo_final: get("prazo_final"),
      status,
      prioridade: get("prioridade") || "media",
      percentual_execucao: Number(f.get("percentual") || 0),
      periodicidade: get("periodicidade"),
      observacoes: get("observacoes"),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plano de Ação</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento das ações institucionais do PGA.</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova ação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova ação</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Código" name="codigo" required />
                  <Field label="Título" name="titulo" required />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea name="descricao" rows={2} />
                </div>
                <div>
                  <Label>Objetivo</Label>
                  <Textarea name="objetivo" rows={2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectField label="Programa" name="programa" options={PROGRAMAS.map(p => ({ value: p, label: p }))} />
                  <SelectField label="Eixo estratégico" name="eixo" options={EIXOS.map(e => ({ value: e, label: e }))} />
                  <SelectField label="Área *" name="area" options={(areas ?? []).map(a => ({ value: a.id, label: a.nome }))} />
                  <SelectField label="Responsável (cadastrado)" name="responsavel" options={(usuarios ?? []).map(u => ({ value: u.id, label: u.nome }))} />
                  <Field label="Responsável (texto livre)" name="responsavel_nome" placeholder="Use se não há cadastro" />
                  <SelectField label="Periodicidade" name="periodicidade" options={PERIODICIDADES.map(p => ({ value: p, label: p }))} />
                  <Field label="Data início" name="data_inicio" type="date" />
                  <Field label="Prazo final" name="prazo_final" type="date" />
                  <SelectField label="Status *" name="status" defaultValue="nao_iniciada"
                    options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                  <SelectField label="Prioridade" name="prioridade" defaultValue="media"
                    options={Object.entries(PRIORIDADE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                  <Field label="% Execução" name="percentual" type="number" min={0} max={100} defaultValue="0" />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea name="observacoes" rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar por título, código ou descrição"
              value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="pl-9" />
          </div>
          <SelectFilter value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
            placeholder="Status" options={[{ value: "all", label: "Todos status" }, ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
          <SelectFilter value={filters.eixo} onChange={(v) => setFilters({ ...filters, eixo: v })}
            placeholder="Eixo" options={[{ value: "all", label: "Todos eixos" }, ...EIXOS.map(e => ({ value: e, label: e }))]} />
          <SelectFilter value={filters.area} onChange={(v) => setFilters({ ...filters, area: v })}
            placeholder="Área" options={[{ value: "all", label: "Todas áreas" }, ...(areas ?? []).map(a => ({ value: a.id, label: a.nome }))]} />
          <SelectFilter value={filters.responsavel} onChange={(v) => setFilters({ ...filters, responsavel: v })}
            placeholder="Responsável" options={[{ value: "all", label: "Todos responsáveis" }, ...responsavelOptions.map(n => ({ value: n, label: n }))]} />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhuma ação encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <Th>Código</Th><Th>Título</Th><Th>Área</Th><Th>Responsável</Th>
                  <Th>Prazo</Th><Th>%</Th><Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const pz = prazoCor(a.prazo_final, a.status);
                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="px-3 py-2 font-mono text-xs">{a.codigo}</td>
                      <td className="px-3 py-2">
                        <Link to="/plano-acao/$id" params={{ id: a.id }} className="font-medium hover:underline">{a.titulo}</Link>
                        <p className="text-xs text-muted-foreground truncate max-w-md">{a.eixo_estrategico ?? "—"}</p>
                      </td>
                      <td className="px-3 py-2 text-xs">{(a as any).area?.nome ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{(a as any).responsavel?.nome ?? a.responsavel_nome ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span>{fmtDate(a.prazo_final)}</span>
                          {pz.dias !== null && <Badge className={`${pz.color} text-[10px]`}>{pz.label}</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">{a.percentual_execucao}%</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{STATUS_LABELS[a.status]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">{children}</th>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <div>
      <Label htmlFor={rest.name}>{label}</Label>
      <Input id={rest.name} {...rest} />
    </div>
  );
}

function SelectField({ label, name, options, defaultValue }: { label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string }) {
  const [v, setV] = useState(defaultValue ?? "");
  return (
    <div>
      <Label>{label}</Label>
      <input type="hidden" name={name} value={v} />
      <Select value={v} onValueChange={setV}>
        <SelectTrigger><SelectValue placeholder={`Selecione ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function SelectFilter({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
