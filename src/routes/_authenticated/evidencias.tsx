import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  EVIDENCE_BUCKET,
  EVIDENCE_STORAGE_NOT_CONFIGURED_MESSAGE,
  checkEvidenceStorageConfigured,
  prepareEvidenceUpload,
  registerEvidenceRecord,
} from "@/lib/acoes.functions";
import type { EvidenciaRegistroInput, EvidenciaUploadInput } from "@/lib/security-schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, FileText, Download, ExternalLink, FolderOpen, Plus } from "lucide-react";
import { fmtDate } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/evidencias")({
  head: () => ({ meta: [{ title: "Evidencias - SIGOV-SISPREV" }] }),
  component: Evidencias,
});

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "enviada", label: "Enviada" },
  { value: "validada", label: "Validada" },
  { value: "rejeitada", label: "Rejeitada" },
];

function Evidencias() {
  const { permissionLevel } = useAuth();
  const qc = useQueryClient();
  const checkEvidenceStorageFn = useServerFn(checkEvidenceStorageConfigured);
  const prepareEvidenceFn = useServerFn(prepareEvidenceUpload);
  const registerEvidenceFn = useServerFn(registerEvidenceRecord);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [acaoId, setAcaoId] = useState("");
  const [status, setStatus] = useState<EvidenciaRegistroInput["status"]>("pendente");
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
      const file = fileRef.current?.files?.[0] ?? null;
      let storageSkipped = false;
      const get = (key: string) => form.get(key)?.toString().trim() || null;
      const selectedAcaoId = get("acao_id");
      const nomeEvidencia = get("nome_evidencia");
      if (!selectedAcaoId || !nomeEvidencia) {
        throw new Error("Informe a acao vinculada e o nome da evidencia.");
      }

      const payload: EvidenciaRegistroInput = {
        acao_id: selectedAcaoId,
        nome_evidencia: nomeEvidencia,
        tipo_evidencia: get("tipo_evidencia"),
        link_externo: get("link_externo"),
        caminho_pasta: get("caminho_pasta"),
        numero_processo: get("numero_processo"),
        data_evidencia: get("data_evidencia"),
        observacao: get("observacao"),
        status,
        caminho_arquivo: null,
        nome_arquivo: null,
        tipo_arquivo: null,
      };

      if (file) {
        const storage = await checkEvidenceStorageFn();
        if (!storage.configured) {
          storageSkipped = true;
        } else {
          const metadata: EvidenciaUploadInput = {
            acao_id: selectedAcaoId,
            nome_arquivo: file.name,
            tipo_arquivo: file.type as EvidenciaUploadInput["tipo_arquivo"],
            tamanho: file.size,
            observacao: get("observacao"),
          };
          const prepared = await prepareEvidenceFn({ data: metadata });
          const { error: uploadError } = await supabase.storage
            .from(EVIDENCE_BUCKET)
            .upload(prepared.path, file);
          if (uploadError) throw uploadError;
          payload.caminho_arquivo = prepared.path;
          payload.nome_arquivo = file.name;
          payload.tipo_arquivo = file.type;
          payload.status = status === "pendente" ? "enviada" : status;
        }
      }

      await registerEvidenceFn({ data: payload });
      return { storageSkipped };
    },
    onSuccess: ({ storageSkipped }) => {
      if (storageSkipped) {
        toast.warning(EVIDENCE_STORAGE_NOT_CONFIGURED_MESSAGE);
        toast.success("Evidencia cadastrada sem arquivo");
      } else {
        toast.success("Evidencia cadastrada");
      }
      qc.invalidateQueries({ queryKey: ["evidencias-all"] });
      setOpen(false);
      setAcaoId("");
      setStatus("pendente");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar evidencia"),
  });

  async function download(path: string | null, nome: string) {
    if (!path) return;
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Erro ao gerar link");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = nome;
    a.click();
  }

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
                  <Field label="Nome da evidencia *" name="nome_evidencia" required />
                  <Field
                    label="Tipo da evidencia"
                    name="tipo_evidencia"
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
                    name="caminho_pasta"
                    placeholder="\\servidor\\sisprev\\progestao\\2026\\seguranca\\psi_aprovada.pdf"
                  />
                  <Field label="Numero do processo/documento" name="numero_processo" />
                  <Field label="Data da evidencia" name="data_evidencia" type="date" />
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <input type="hidden" name="status" value={status} />
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        setStatus(value as EvidenciaRegistroInput["status"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Upload opcional</Label>
                    <Input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" />
                  </div>
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
                      <Badge variant="outline" className="text-[10px]">
                        {statusLabel(e.status)}
                      </Badge>
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
                      {e.tipo_evidencia ?? e.tipo_arquivo ?? "Sem tipo"} - {e.usuario?.nome ?? "-"}{" "}
                      - {fmtDate(e.data_evidencia ?? e.created_at)}
                    </p>
                    {(e.numero_processo || e.caminho_pasta || e.link_externo) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[e.numero_processo, e.caminho_pasta, e.link_externo]
                          .filter(Boolean)
                          .join(" - ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {e.link_externo && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={e.link_externo} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {e.caminho_pasta && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigator.clipboard?.writeText(e.caminho_pasta)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  )}
                  {e.caminho_arquivo && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => download(e.caminho_arquivo, e.nome_arquivo)}
                    >
                      <Download className="h-4 w-4" />
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

function statusLabel(status: string | null | undefined) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Pendente";
}
