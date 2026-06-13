import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { registerEvidenceRecord } from "@/lib/acoes.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, FolderOpen, Plus } from "lucide-react";
import { fmtDate } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/evidencias")({
  head: () => ({ meta: [{ title: "Evidencias - SIGOV-SISPREV" }] }),
  component: Evidencias,
});

function Evidencias() {
  const { permissionLevel } = useAuth();
  const qc = useQueryClient();
  const registerEvidenceFn = useServerFn(registerEvidenceRecord);
  const [open, setOpen] = useState(false);
  const [acaoId, setAcaoId] = useState("");
  const canRegister = permissionLevel !== "consulta";

  const { data, isLoading } = useQuery({
    queryKey: ["evidencias-all"],
    queryFn: async () =>
      (
        await supabase
          .from("evidencias")
          .select("*, usuario:profiles(nome), acao:acoes(id,titulo,codigo)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const { data: acoes } = useQuery({
    queryKey: ["evidencias-acoes-options"],
    queryFn: async () =>
      (await supabase.from("acoes").select("id,codigo,titulo").order("codigo")).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: async (form: FormData) => {
      const get = (key: string) => form.get(key)?.toString().trim() || null;
      const selectedAcaoId = get("acao_id");
      const nomeArquivo = get("nome_arquivo");
      if (!selectedAcaoId || !nomeArquivo) {
        throw new Error("Informe a acao vinculada e o nome da evidencia.");
      }

      await registerEvidenceFn({
        data: {
          acao_id: selectedAcaoId,
          nome_arquivo: nomeArquivo,
          tipo_arquivo: get("tipo_arquivo"),
          caminho_arquivo: get("caminho_arquivo"),
          link_externo: get("link_externo"),
          numero_processo: get("numero_processo"),
          observacao: get("observacao"),
        },
      });
    },
    onSuccess: () => {
      toast.success("Evidencia cadastrada");
      qc.invalidateQueries({ queryKey: ["evidencias-all"] });
      setOpen(false);
      setAcaoId("");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar evidencia"),
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Evidencias</h1>
          <p className="text-sm text-muted-foreground">
            Indice de arquivos comprobatórios vinculados as ações.
          </p>
        </div>
        {canRegister && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova evidencia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar evidencia</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label>Acao vinculada *</Label>
                    <input type="hidden" name="acao_id" value={acaoId} />
                    <Select value={acaoId} onValueChange={setAcaoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a acao" />
                      </SelectTrigger>
                      <SelectContent>
                        {(acoes ?? []).map((acao) => (
                          <SelectItem key={acao.id} value={acao.id}>
                            {acao.codigo} - {acao.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Nome da evidencia *" name="nome_arquivo" required />
                  <Field
                    label="Tipo da evidencia"
                    name="tipo_arquivo"
                    placeholder="PDF, Ata, Oficio, Processo"
                  />
                  <Field
                    label="Link externo"
                    name="link_externo"
                    type="url"
                    placeholder="https://..."
                  />
                  <Field
                    label="Caminho da pasta/rede"
                    name="caminho_arquivo"
                    placeholder="\\servidor\\sisprev\\progestao\\2026\\seguranca\\psi_aprovada.pdf"
                    required
                  />
                  <Field label="Numero do processo/documento" name="numero_processo" />
                  <div className="space-y-1 md:col-span-2">
                    <Label>Observacoes</Label>
                    <Textarea name="observacao" rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground p-12">
            Nenhuma evidencia cadastrada.
          </p>
        ) : (
          <ul className="divide-y">
            {data?.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium truncate">{e.nome_arquivo}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.acao ? (
                        <Link
                          to="/plano-acao/$id"
                          params={{ id: e.acao.id }}
                          className="hover:underline"
                        >
                          {e.acao.codigo} - {e.acao.titulo}
                        </Link>
                      ) : (
                        "Acao removida"
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.tipo_arquivo ?? "Sem tipo"} - {e.usuario?.nome ?? "-"} -{" "}
                      {fmtDate(e.created_at)}
                    </p>
                    {e.observacao && (
                      <p className="text-xs text-muted-foreground truncate">{e.observacao}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {e.caminho_arquivo && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigator.clipboard?.writeText(e.caminho_arquivo)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <div className="space-y-1">
      <Label htmlFor={rest.name}>{label}</Label>
      <Input id={rest.name} {...rest} />
    </div>
  );
}
