import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createAcao } from "@/lib/acoes.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Loader2, Filter, X } from "lucide-react";
import {
  STATUS_LABELS,
  PRIORIDADE_LABELS,
  EIXOS,
  PROGRAMAS,
  PERIODICIDADES,
  fmtDate,
  prazoCor,
} from "@/lib/acao-helpers";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/plano-acao/")({
  head: () => ({ meta: [{ title: "Plano de Ação — SIGOV-SISPREV" }] }),
  validateSearch: (search: Record<string, unknown>) => parseFiltersFromSearch(search),
  component: PlanoAcao,
});

type FilterKey = "q" | "plano" | "status" | "eixo" | "programa" | "area" | "responsavel" | "prazo";
type Filters = Record<FilterKey, string>;

const DEFAULT_FILTERS: Filters = {
  q: "",
  plano: "all",
  status: "all",
  eixo: "all",
  programa: "all",
  area: "all",
  responsavel: "all",
  prazo: "all",
};

type NomeRef = { nome: string | null };
type RefOption = { id: string; nome: string | null };
type PlanoOption = RefOption & { ano?: number | string | null };
type PlanoAcaoRow = {
  id?: string;
  codigo?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  plano_anual_id?: string | null;
  eixo_id?: string | null;
  programa_id?: string | null;
  area_id?: string | null;
  responsavel_id?: string | null;
  percentual_execucao?: number | null;
  area?: NomeRef | null;
  responsavel?: NomeRef | null;
  responsavel_nome?: string | null;
  plano?: NomeRef | null;
  eixo?: NomeRef | null;
  programa_ref?: NomeRef | null;
  eixo_estrategico?: string | null;
  programa?: string | null;
  prazo_final?: string | null;
  status?: string | null;
};
type CreateAcaoForm = Record<string, string | number | null>;

function PlanoAcao() {
  const { canManage } = useAuth();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const createAcaoFn = useServerFn(createAcao);
  const [filters, setFilters] = useState<Filters>(() => buildFilters(search));
  const [open, setOpen] = useState(false);
  const isSimpleUser = !canManage;
  const effectiveFilters = canManage ? filters : getSimpleUserFilters(filters);

  useEffect(() => {
    setFilters(buildFilters(search));
  }, [
    search.q,
    search.plano,
    search.status,
    search.eixo,
    search.programa,
    search.area,
    search.responsavel,
    search.prazo,
  ]);

  const {
    data: acoes,
    isLoading,
    error: acoesError,
  } = useQuery({
    queryKey: ["acoes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acoes")
        .select("*")
        .order("prazo_final", { ascending: true });
      if (error) {
        console.error("[PGA/Plano de Ação] Erro ao consultar ações:", error);
        throw error;
      }
      return data ?? [];
    },
  });

  const { data: planos } = useQuery({
    queryKey: ["planos-options"],
    queryFn: async () =>
      (await supabase.from("plano_anual").select("id,ano,nome").order("ano", { ascending: false }))
        .data ?? [],
  });

  const { data: eixos } = useQuery({
    queryKey: ["pga-eixos-options"],
    queryFn: async () =>
      (await supabase.from("pga_eixos").select("id,nome,ordem").order("ordem")).data ?? [],
  });

  const { data: programas } = useQuery({
    queryKey: ["pga-programas-options"],
    queryFn: async () =>
      (await supabase.from("pga_programas").select("id,nome,ordem").order("ordem")).data ?? [],
  });

  const { data: areas } = useQuery({
    queryKey: ["areas-options"],
    queryFn: async () => (await supabase.from("areas").select("id,nome").order("nome")).data ?? [],
  });

  const { data: usuarios } = useQuery({
    queryKey: ["usuarios-options"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id,nome").order("nome")).data ?? [],
  });

  const filtered = (acoes ?? []).filter((a) => {
    const eixoNome = getEixoNome(a, eixos);
    const programaNome = getProgramaNome(a, programas);
    const selectedEixoNome = resolveSelectedNome(effectiveFilters.eixo, eixos);
    const selectedProgramaNome = resolveSelectedNome(effectiveFilters.programa, programas);
    if (
      effectiveFilters.q &&
      !`${a.titulo} ${a.codigo} ${a.descricao ?? ""} ${a.responsavel_nome ?? ""} ${eixoNome} ${programaNome}`
        .toLowerCase()
        .includes(effectiveFilters.q.toLowerCase())
    )
      return false;
    if (effectiveFilters.plano !== "all" && a.plano_anual_id !== effectiveFilters.plano)
      return false;
    if (effectiveFilters.status !== "all" && a.status !== effectiveFilters.status) return false;
    if (
      effectiveFilters.eixo !== "all" &&
      !matchesRefOrLegacy(a.eixo_id, eixoNome, effectiveFilters.eixo, selectedEixoNome)
    )
      return false;
    if (
      effectiveFilters.programa !== "all" &&
      !matchesRefOrLegacy(
        a.programa_id,
        programaNome,
        effectiveFilters.programa,
        selectedProgramaNome,
      )
    )
      return false;
    if (effectiveFilters.area !== "all" && a.area_id !== effectiveFilters.area) return false;
    if (effectiveFilters.responsavel !== "all") {
      const nome = getResponsavelNome(a, usuarios);
      if (nome !== effectiveFilters.responsavel) return false;
    }
    if (effectiveFilters.prazo !== "all" && !matchesPrazoFilter(a, effectiveFilters.prazo))
      return false;
    return true;
  });

  const responsavelOptions = Array.from(
    new Set((acoes ?? []).map((a) => getResponsavelNome(a, usuarios)).filter(Boolean)),
  ) as string[];
  const eixoOptions = Array.from(
    new Set([
      ...(eixos ?? []).map((e) => e.nome).filter(Boolean),
      ...((acoes ?? []).map((a) => a.eixo_estrategico).filter(Boolean) as string[]),
    ]),
  );
  const programaOptions = Array.from(
    new Set([
      ...(programas ?? []).map((p) => p.nome).filter(Boolean),
      ...((acoes ?? []).map((a) => a.programa).filter(Boolean) as string[]),
    ]),
  );
  const activeFilters = Object.entries(effectiveFilters).filter(
    ([key, value]) => value !== DEFAULT_FILTERS[key as keyof typeof DEFAULT_FILTERS],
  ).length;
  const statusResumo = {
    total: filtered.length,
    emAndamento: filtered.filter((a) => a.status === "em_andamento").length,
    concluidas: filtered.filter((a) => a.status === "concluida").length,
    atrasadas: filtered.filter((a) => matchesPrazoFilter(a, "atrasadas")).length,
  };

  const createMutation = useMutation({
    mutationFn: async (form: CreateAcaoForm) => {
      await createAcaoFn({ data: form });
    },
    onSuccess: () => {
      toast.success("Ação criada com sucesso");
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-acoes"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => f.get(k)?.toString().trim() || null;
    const codigo = get("codigo");
    const titulo = get("titulo");
    const area_id = get("area");
    const status = get("status") || "nao_iniciada";
    const responsavel_id = get("responsavel");
    const responsavel_nome = get("responsavel_nome");
    if (!codigo || !titulo || !area_id || !status || (!responsavel_id && !responsavel_nome)) {
      toast.error("Título, Área, Status e Responsável são obrigatórios.");
      return;
    }
    createMutation.mutate({
      codigo,
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
          <h1 className="text-2xl font-bold">PGA / Plano de Ação</h1>
          <p className="text-sm text-muted-foreground">
            {isSimpleUser
              ? "Consulta simplificada das ações permitidas para seu perfil."
              : "Acompanhamento das ações institucionais por status, prazo e responsável."}
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova ação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova ação</DialogTitle>
              </DialogHeader>
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
                  <SelectField
                    label="Programa"
                    name="programa"
                    options={PROGRAMAS.map((p) => ({ value: p, label: p }))}
                  />
                  <SelectField
                    label="Eixo estratégico"
                    name="eixo"
                    options={EIXOS.map((e) => ({ value: e, label: e }))}
                  />
                  <SelectField
                    label="Área *"
                    name="area"
                    options={(areas ?? []).map((a) => ({ value: a.id, label: a.nome }))}
                  />
                  <SelectField
                    label="Responsável (cadastrado)"
                    name="responsavel"
                    options={(usuarios ?? []).map((u) => ({ value: u.id, label: u.nome }))}
                  />
                  <Field
                    label="Responsável (texto livre)"
                    name="responsavel_nome"
                    placeholder="Use se não há cadastro"
                  />
                  <SelectField
                    label="Periodicidade"
                    name="periodicidade"
                    options={PERIODICIDADES.map((p) => ({ value: p, label: p }))}
                  />
                  <Field label="Data início" name="data_inicio" type="date" />
                  <Field label="Prazo final" name="prazo_final" type="date" />
                  <SelectField
                    label="Status *"
                    name="status"
                    defaultValue="nao_iniciada"
                    options={Object.entries(STATUS_LABELS).map(([v, l]) => ({
                      value: v,
                      label: l,
                    }))}
                  />
                  <SelectField
                    label="Prioridade"
                    name="prioridade"
                    defaultValue="media"
                    options={Object.entries(PRIORIDADE_LABELS).map(([v, l]) => ({
                      value: v,
                      label: l,
                    }))}
                  />
                  <Field
                    label="% Execução"
                    name="percentual"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue="0"
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea name="observacoes" rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isSimpleUser && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Para sua rotina, use Minhas Ações</p>
              <p className="text-xs text-muted-foreground">
                Esta tela mostra apenas o que a RLS permite, com filtros reduzidos.
              </p>
            </div>
            <Button asChild>
              <Link to="/minhas-acoes">Abrir Minhas Ações</Link>
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Filtros</p>
            <p className="text-xs text-muted-foreground">
              {activeFilters
                ? `${activeFilters} filtro(s) aplicado(s)`
                : "Mostrando todas as ações"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            disabled={!activeFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <Label>Busca</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Título, código, descrição, eixo ou responsável"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>
          {canManage && (
            <SelectFilter
              label="Plano"
              value={filters.plano}
              onChange={(v) => setFilters({ ...filters, plano: v })}
              placeholder="Plano Anual"
              options={[
                { value: "all", label: "Todos planos" },
                ...(planos ?? []).map((p) => ({ value: p.id, label: `${p.nome} (${p.ano})` })),
              ]}
            />
          )}
          <SelectFilter
            label="Status"
            value={filters.status}
            onChange={(v) => setFilters({ ...filters, status: v })}
            placeholder="Status"
            options={[
              { value: "all", label: "Todos status" },
              ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
          {canManage && (
            <>
              <SelectFilter
                label="Eixo"
                value={filters.eixo}
                onChange={(v) => setFilters({ ...filters, eixo: v })}
                placeholder="Eixo"
                options={[
                  { value: "all", label: "Todos eixos" },
                  ...(eixos ?? []).map((e) => ({ value: e.id, label: e.nome })),
                  ...eixoOptions.map((e) => ({ value: e, label: e })),
                ]}
              />
              <SelectFilter
                label="Programa"
                value={filters.programa}
                onChange={(v) => setFilters({ ...filters, programa: v })}
                placeholder="Programa"
                options={[
                  { value: "all", label: "Todos programas" },
                  ...(programas ?? []).map((p) => ({ value: p.id, label: p.nome })),
                  ...programaOptions.map((p) => ({ value: p, label: p })),
                ]}
              />
              <SelectFilter
                label="Área"
                value={filters.area}
                onChange={(v) => setFilters({ ...filters, area: v })}
                placeholder="Área"
                options={[
                  { value: "all", label: "Todas áreas" },
                  ...(areas ?? []).map((a) => ({ value: a.id, label: a.nome })),
                ]}
              />
              <SelectFilter
                label="Responsável"
                value={filters.responsavel}
                onChange={(v) => setFilters({ ...filters, responsavel: v })}
                placeholder="Responsável"
                options={[
                  { value: "all", label: "Todos responsáveis" },
                  ...responsavelOptions.map((n) => ({ value: n, label: n })),
                ]}
              />
            </>
          )}
          <SelectFilter
            label="Prazo"
            value={filters.prazo}
            onChange={(v) => setFilters({ ...filters, prazo: v })}
            placeholder="Prazo"
            options={[
              { value: "all", label: "Todos prazos" },
              { value: "atrasadas", label: "Atrasadas" },
              { value: "vence_30", label: "Vencem em 30 dias" },
              { value: "sem_prazo", label: "Sem prazo" },
            ]}
          />
        </div>
      </Card>

      {canManage && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ResumoCard label="Ações filtradas" value={statusResumo.total} />
          <ResumoCard label="Em andamento" value={statusResumo.emAndamento} tone="info" />
          <ResumoCard label="Concluídas" value={statusResumo.concluidas} tone="success" />
          <ResumoCard label="Atrasadas" value={statusResumo.atrasadas} tone="destructive" />
        </div>
      )}

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : acoesError ? (
          <div className="p-12 text-center text-sm text-destructive">
            Não foi possível carregar as ações do PGA. Verifique o console para detalhes da
            consulta.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhuma ação encontrada com os filtros atuais. Tente limpar os filtros ou escolher outro
            eixo/programa.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <Th>Código</Th>
                  <Th>Título</Th>
                  <Th>Plano / Eixo / Programa</Th>
                  <Th>Área</Th>
                  <Th>Responsável</Th>
                  <Th>Prazo</Th>
                  <Th>%</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const pz = prazoCor(a.prazo_final, a.status);
                  return (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="px-3 py-2 font-mono text-xs">{a.codigo}</td>
                      <td className="px-3 py-2">
                        <Link
                          to="/plano-acao/$id"
                          params={{ id: a.id }}
                          className="font-medium hover:underline"
                        >
                          {a.titulo}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {a.descricao ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs min-w-[240px]">
                        <div className="space-y-1">
                          <p className="font-medium">{getPlanoNome(a, planos)}</p>
                          <p className="text-muted-foreground">{getEixoNome(a, eixos)}</p>
                          <p className="text-muted-foreground truncate max-w-xs">
                            {getProgramaNome(a, programas)}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">{getAreaNome(a, areas)}</td>
                      <td className="px-3 py-2 text-xs">{getResponsavelNome(a, usuarios)}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span>{fmtDate(a.prazo_final)}</span>
                          {pz.dias !== null && (
                            <Badge className={`${pz.color} text-[10px]`}>{pz.label}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">{a.percentual_execucao}%</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">
                          {STATUS_LABELS[a.status]}
                        </Badge>
                      </td>
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
  return (
    <th className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {children}
    </th>
  );
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

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  const [v, setV] = useState(defaultValue ?? "");
  return (
    <div>
      <Label>{label}</Label>
      <input type="hidden" name={name} value={v} />
      <Select value={v} onValueChange={setV}>
        <SelectTrigger>
          <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ResumoCard({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "info" | "success" | "destructive";
}) {
  const toneMap = {
    primary: "text-primary",
    info: "text-info",
    success: "text-success",
    destructive: "text-destructive",
  };
  return (
    <Card className="p-4">
      <p className={`text-2xl font-bold ${toneMap[tone]}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function parseFiltersFromSearch(search: Record<string, unknown>) {
  const parsed: Partial<Filters> = {};
  (Object.keys(DEFAULT_FILTERS) as FilterKey[]).forEach((key) => {
    const value = search[key];
    if (typeof value === "string" && value.trim()) parsed[key] = value.trim();
  });
  return parsed;
}

function buildFilters(search: Partial<Filters>): Filters {
  return { ...DEFAULT_FILTERS, ...search };
}

function getSimpleUserFilters(filters: Filters): Filters {
  return {
    ...filters,
    plano: "all",
    eixo: "all",
    programa: "all",
    area: "all",
    responsavel: "all",
  };
}

function getPlanoNome(acao: PlanoAcaoRow, planos?: PlanoOption[]) {
  const planoNome = acao.plano_anual_id
    ? planos?.find((plano) => plano.id === acao.plano_anual_id)?.nome
    : null;
  return planoNome ?? acao.plano?.nome ?? "Sem plano";
}

function getEixoNome(acao: PlanoAcaoRow, eixos?: RefOption[]) {
  const eixoNome = acao.eixo_id ? eixos?.find((eixo) => eixo.id === acao.eixo_id)?.nome : null;
  return eixoNome ?? acao.eixo?.nome ?? acao.eixo_estrategico ?? "Sem eixo";
}

function getProgramaNome(acao: PlanoAcaoRow, programas?: RefOption[]) {
  const programaNome = acao.programa_id
    ? programas?.find((programa) => programa.id === acao.programa_id)?.nome
    : null;
  return programaNome ?? acao.programa_ref?.nome ?? acao.programa ?? "Sem programa";
}

function getAreaNome(acao: PlanoAcaoRow, areas?: RefOption[]) {
  return (
    (acao.area_id ? areas?.find((area) => area.id === acao.area_id)?.nome : null) ??
    acao.area?.nome ??
    "—"
  );
}

function getResponsavelNome(acao: PlanoAcaoRow, usuarios?: RefOption[]) {
  return (
    (acao.responsavel_id
      ? usuarios?.find((usuario) => usuario.id === acao.responsavel_id)?.nome
      : null) ??
    acao.responsavel?.nome ??
    acao.responsavel_nome ??
    "—"
  );
}

function matchesRefOrLegacy(
  id: string | null | undefined,
  resolvedName: string,
  selected: string,
  selectedName: string,
) {
  if (id && selected === id) return true;
  return normalizeFilterValue(resolvedName) === normalizeFilterValue(selectedName);
}

function resolveSelectedNome(selected: string, options?: RefOption[]) {
  return options?.find((option) => option.id === selected)?.nome ?? selected;
}

function normalizeFilterValue(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesPrazoFilter(acao: PlanoAcaoRow, filter: string) {
  if (filter === "sem_prazo") return !acao.prazo_final;
  if (!acao.prazo_final || acao.status === "concluida" || acao.status === "cancelada") return false;
  const dias = differenceInDays(parseISO(acao.prazo_final), new Date());
  if (filter === "atrasadas") return dias < 0;
  if (filter === "vence_30") return dias >= 0 && dias <= 30;
  return true;
}
