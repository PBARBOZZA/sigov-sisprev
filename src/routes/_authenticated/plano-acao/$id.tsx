import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  adicionarApoiadorAcao,
  prepareEvidenceUpload,
  registerEvidenceUpload,
  removerApoiadorAcao,
  updateAcao,
  vincularResponsavelAcao,
} from "@/lib/acoes.functions";
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
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Loader2,
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  FileText,
  Download,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { STATUS_LABELS, PRIORIDADE_LABELS, fmtDate, prazoCor } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plano-acao/$id")({
  head: () => ({ meta: [{ title: "Detalhes da Acao - SIGOV-SISPREV" }] }),
  component: AcaoDetalhes,
});

function AcaoDetalhes() {
  const { id } = Route.useParams();
  const { user, isAdmin, canManage, permissionLevel } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const updateAcaoFn = useServerFn(updateAcao);
  const vincularResponsavelFn = useServerFn(vincularResponsavelAcao);
  const adicionarApoiadorFn = useServerFn(adicionarApoiadorAcao);
  const removerApoiadorFn = useServerFn(removerApoiadorAcao);
  const prepareEvidenceFn = useServerFn(prepareEvidenceUpload);
  const registerEvidenceFn = useServerFn(registerEvidenceUpload);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState("");
  const [apoiadorSelecionado, setApoiadorSelecionado] = useState("");

  const {
    data: acao,
    isLoading,
    error: acaoError,
  } = useQuery({
    queryKey: ["acao", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("acoes").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[PGA/Detalhe] Erro ao carregar acao principal:", error);
        throw error;
      }
      return data;
    },
  });

  const { data: referencias } = useQuery({
    queryKey: ["acao-referencias", id, acao?.area_id, acao?.responsavel_id],
    enabled: !!acao,
    queryFn: async () => {
      const result: {
        area: { id: string; nome: string } | null;
        responsavel: { id: string; nome: string; email: string | null } | null;
        errors: string[];
      } = { area: null, responsavel: null, errors: [] };

      if (acao?.area_id) {
        const { data, error } = await supabase
          .from("areas")
          .select("id,nome")
          .eq("id", acao.area_id)
          .maybeSingle();
        if (error) {
          console.error("[PGA/Detalhe] Erro ao carregar area da acao:", error);
          result.errors.push("Nao foi possivel carregar a area vinculada.");
        } else {
          result.area = data;
        }
      }

      if (acao?.responsavel_id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,nome,email")
          .eq("id", acao.responsavel_id)
          .maybeSingle();
        if (error) {
          console.error("[PGA/Detalhe] Erro ao carregar responsavel da acao:", error);
          result.errors.push("Nao foi possivel carregar o responsavel vinculado.");
        } else {
          result.responsavel = data;
        }
      }

      return result;
    },
  });

  const { data: evidenciasResult } = useQuery({
    queryKey: ["evidencias", id],
    queryFn: async () => {
      const { data: evidenciasData, error } = await supabase
        .from("evidencias")
        .select("*")
        .eq("acao_id", id);
      if (error) {
        console.error("[PGA/Detalhe] Erro ao carregar evidencias:", error);
        return { items: [], error: "Nao foi possivel carregar as evidencias." };
      }

      const usuarioIds = Array.from(new Set((evidenciasData ?? []).map((e) => e.usuario_id)));
      const profiles =
        usuarioIds.length > 0
          ? await supabase.from("profiles").select("id,nome").in("id", usuarioIds)
          : { data: [], error: null };

      if (profiles.error) {
        console.error("[PGA/Detalhe] Erro ao carregar usuarios das evidencias:", profiles.error);
      }

      const items = (evidenciasData ?? [])
        .map((evidencia) => ({
          ...evidencia,
          usuario: profiles.data?.find((profile) => profile.id === evidencia.usuario_id) ?? null,
        }))
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

      return {
        items,
        error: profiles.error ? "Evidencias carregadas sem os nomes dos usuarios." : null,
      };
    },
  });

  const { data: usuariosVinculoResult } = useQuery({
    queryKey: ["usuarios-vinculo-acoes"],
    enabled: canManage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,nome,email,status")
        .eq("status", true);
      if (error) {
        console.error("[PGA/Detalhe] Erro ao carregar usuarios para vinculo:", error);
        return { items: [], error: "Nao foi possivel carregar usuarios para vinculo." };
      }

      return {
        items: (data ?? []).sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "")),
        error: null,
      };
    },
  });

  const { data: apoiadoresResult } = useQuery({
    queryKey: ["acao-apoiadores", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: vinculos, error } = await supabase
        .from("acoes_apoiadores")
        .select("id,usuario_id")
        .eq("acao_id", id);
      if (error) {
        console.error("[PGA/Detalhe] Erro ao carregar apoiadores:", error);
        return { items: [], error: "Nao foi possivel carregar os apoiadores." };
      }

      const usuarioIds = Array.from(new Set((vinculos ?? []).map((v) => v.usuario_id)));
      if (!usuarioIds.length) return { items: [], error: null };

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,nome,email,status")
        .in("id", usuarioIds);
      if (profilesError) {
        console.error("[PGA/Detalhe] Erro ao carregar usuarios apoiadores:", profilesError);
      }

      return {
        items: (vinculos ?? []).map((vinculo) => ({
          ...vinculo,
          usuario: profiles?.find((profile) => profile.id === vinculo.usuario_id) ?? null,
        })),
        error: profilesError ? "Apoiadores carregados sem os nomes dos usuarios." : null,
      };
    },
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (acao) {
      setForm(acao);
      setResponsavelSelecionado(acao.responsavel_id ?? "");
    }
  }, [acao]);

  const updateMutation = useMutation({
    mutationFn: async (patch: any) => {
      await updateAcaoFn({ data: { id, ...patch } });
    },
    onSuccess: () => {
      toast.success("Acao atualizada");
      qc.invalidateQueries({ queryKey: ["acao", id] });
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-acoes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("acoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acao excluida");
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
      navigate({ to: "/plano-acao" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const vincularResponsavelMutation = useMutation({
    mutationFn: async () => {
      if (!responsavelSelecionado) throw new Error("Selecione um responsavel.");
      await vincularResponsavelFn({
        data: {
          acao_id: id,
          responsavel_id: responsavelSelecionado,
          atualizar_responsavel_nome: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("Responsavel vinculado");
      qc.invalidateQueries({ queryKey: ["acao", id] });
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
      qc.invalidateQueries({ queryKey: ["minhas-acoes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-acoes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const adicionarApoiadorMutation = useMutation({
    mutationFn: async () => {
      if (!apoiadorSelecionado) throw new Error("Selecione um apoiador.");
      await adicionarApoiadorFn({ data: { acao_id: id, usuario_id: apoiadorSelecionado } });
    },
    onSuccess: () => {
      toast.success("Apoiador adicionado");
      setApoiadorSelecionado("");
      qc.invalidateQueries({ queryKey: ["acao-apoiadores", id] });
      qc.invalidateQueries({ queryKey: ["minhas-acoes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removerApoiadorMutation = useMutation({
    mutationFn: async (usuarioId: string) => {
      await removerApoiadorFn({ data: { acao_id: id, usuario_id: usuarioId } });
    },
    onSuccess: () => {
      toast.success("Apoiador removido");
      qc.invalidateQueries({ queryKey: ["acao-apoiadores", id] });
      qc.invalidateQueries({ queryKey: ["minhas-acoes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const metadata = {
        acao_id: id,
        nome_arquivo: file.name,
        tipo_arquivo: file.type as any,
        tamanho: file.size,
        observacao: null,
      };

      const prepared = await prepareEvidenceFn({ data: metadata });
      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(prepared.path, file);
      if (uploadError) throw uploadError;

      await registerEvidenceFn({ data: { ...metadata, caminho_arquivo: prepared.path } });

      toast.success("Evidencia enviada");
      qc.invalidateQueries({ queryKey: ["evidencias", id] });
      if (fileRef.current) fileRef.current.value = "";
    } catch (error: any) {
      toast.error(error?.message ?? "Erro ao enviar evidencia");
    } finally {
      setUploading(false);
    }
  }

  async function downloadEvidencia(path: string, nome: string) {
    const { data, error } = await supabase.storage.from("evidencias").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Erro ao gerar link");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = nome;
    a.click();
  }

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  if (acaoError) {
    return (
      <Card className="p-8 text-center">
        <p className="font-medium text-destructive">Nao foi possivel carregar a acao.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifique o console para detalhes da consulta.
        </p>
      </Card>
    );
  }
  if (!acao) return <p>Acao nao encontrada.</p>;
  if (!form)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin h-6 w-6 text-primary" />
      </div>
    );

  const pz = prazoCor(form.prazo_final, form.status);
  const evidencias = evidenciasResult?.items ?? [];
  const apoiadores = apoiadoresResult?.items ?? [];
  const usuariosVinculo = usuariosVinculoResult?.items ?? [];
  const apoiadorIds = new Set(apoiadores.map((apoiador) => apoiador.usuario_id));
  const isResponsavel = acao.responsavel_id === user?.id;
  const isApoiador = apoiadorIds.has(user?.id ?? "");
  const canEditAction = canManage || (permissionLevel === "responsavel" && isResponsavel);
  const canUpdateProgress = canEditAction || (permissionLevel === "apoiador" && isApoiador);
  const canEditFullOperational = canEditAction;
  const canUploadEvidence = canManage || isResponsavel || isApoiador;
  const usuariosDisponiveisApoio = usuariosVinculo.filter(
    (usuario) => usuario.id !== form.responsavel_id && !apoiadorIds.has(usuario.id),
  );
  const responsavelNome = referencias?.responsavel?.nome ?? acao.responsavel_nome ?? "-";
  const responsavelEmail = referencias?.responsavel?.email ?? "-";
  const areaNome = referencias?.area?.nome ?? "-";

  function update(patch: Partial<typeof form>) {
    setForm({ ...form, ...patch });
  }

  function save() {
    const patch = canEditFullOperational ? {
      status: form.status,
      prioridade: form.prioridade,
      percentual_execucao: form.percentual_execucao,
      data_inicio: form.data_inicio,
      prazo_final: form.prazo_final,
      descricao: form.descricao,
      objetivo: form.objetivo,
      observacoes: form.observacoes,
    } : {
      status: form.status,
      percentual_execucao: form.percentual_execucao,
      observacoes: form.observacoes,
    };
    updateMutation.mutate(patch);
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          to="/plano-acao"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Link>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Excluir esta acao?")) deleteMutation.mutate();
            }}
          >
            <Trash2 className="h-4 w-4 mr-1 text-destructive" />
            Excluir
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground">{acao.codigo}</p>
            <h1 className="text-2xl font-bold">{acao.titulo}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {acao.eixo_estrategico ?? "-"} - {areaNome}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{STATUS_LABELS[form.status]}</Badge>
            <Badge variant="outline">{PRIORIDADE_LABELS[form.prioridade]}</Badge>
            {pz.dias !== null && <Badge className={pz.color}>{pz.label}</Badge>}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Execucao</p>
            <p className="text-sm font-bold text-primary">{form.percentual_execucao}%</p>
          </div>
          <Progress value={form.percentual_execucao} />
          {canUpdateProgress && (
            <Slider
              value={[form.percentual_execucao]}
              max={100}
              step={5}
              onValueChange={(v) => update({ percentual_execucao: v[0] })}
            />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => update({ status: v })}
              disabled={!canUpdateProgress}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select
              value={form.prioridade}
              onValueChange={(v) => update({ prioridade: v })}
              disabled={!canEditFullOperational}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORIDADE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data inicio</Label>
            <Input
              type="date"
              value={form.data_inicio ?? ""}
              onChange={(e) => update({ data_inicio: e.target.value })}
              disabled={!canEditFullOperational}
            />
          </div>
          <div>
            <Label>Prazo final</Label>
            <Input
              type="date"
              value={form.prazo_final ?? ""}
              onChange={(e) => update({ prazo_final: e.target.value })}
              disabled={!canEditFullOperational}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Descricao</Label>
            <Textarea
              value={form.descricao ?? ""}
              onChange={(e) => update({ descricao: e.target.value })}
              rows={3}
              disabled={!canEditFullOperational}
            />
          </div>
          <div>
            <Label>Objetivo</Label>
            <Textarea
              value={form.objetivo ?? ""}
              onChange={(e) => update({ objetivo: e.target.value })}
              rows={2}
              disabled={!canEditFullOperational}
            />
          </div>
          <div>
            <Label>Observacoes</Label>
            <Textarea
              value={form.observacoes ?? ""}
              onChange={(e) => update({ observacoes: e.target.value })}
              rows={3}
              disabled={!canUpdateProgress}
            />
          </div>
        </div>

        {canUpdateProgress && (
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar alteracoes
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t text-xs">
          <Info label="Responsavel" value={responsavelNome} />
          <Info label="E-mail" value={responsavelEmail} />
          <Info label="Programa" value={acao.programa ?? "-"} />
          <Info label="Ultima atualizacao" value={fmtDate(acao.updated_at)} />
        </div>
        {referencias?.errors.length ? (
          <div className="mt-4 space-y-1 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
            {referencias.errors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
      </Card>

      {canManage && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Vinculos de usuarios</h3>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Responsavel real</p>
                <p className="text-xs text-muted-foreground">
                  Vincula a acao a um usuario cadastrado em profiles para aparecer em Minhas Acoes.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Select value={responsavelSelecionado} onValueChange={setResponsavelSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsavel" />
                  </SelectTrigger>
                  <SelectContent>
                    {(usuariosVinculo ?? []).map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => vincularResponsavelMutation.mutate()}
                  disabled={!responsavelSelecionado || vincularResponsavelMutation.isPending}
                >
                  {vincularResponsavelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Vincular
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Nome legado atual: {(acao as any).responsavel_nome ?? "-"}
              </p>
              {usuariosVinculoResult?.error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {usuariosVinculoResult.error}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Apoiadores</p>
                <p className="text-xs text-muted-foreground">
                  Apoiadores tambem passam a ver esta acao em Minhas Acoes.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Select value={apoiadorSelecionado} onValueChange={setApoiadorSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar apoiador" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosDisponiveisApoio.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => adicionarApoiadorMutation.mutate()}
                  disabled={!apoiadorSelecionado || adicionarApoiadorMutation.isPending}
                >
                  {adicionarApoiadorMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Adicionar
                </Button>
              </div>

              {apoiadoresResult?.error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {apoiadoresResult.error}
                </p>
              )}
              {apoiadores.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Nenhum apoiador vinculado.
                </p>
              ) : (
                <ul className="space-y-2">
                  {apoiadores.map((apoiador) => (
                    <li
                      key={apoiador.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {apoiador.usuario?.nome ?? "Usuario nao encontrado"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {apoiador.usuario?.email ?? apoiador.usuario_id}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerApoiadorMutation.mutate(apoiador.usuario_id)}
                        disabled={removerApoiadorMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4 mr-2 text-destructive" />
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Evidencias</h3>
          <div>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={handleUpload}
              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
            />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || !canUploadEvidence}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Anexar evidencia
            </Button>
          </div>
        </div>
        {evidenciasResult?.error && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {evidenciasResult.error}
          </p>
        )}
        {evidencias.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma evidencia cadastrada.
          </p>
        ) : (
          <ul className="space-y-2">
            {evidencias.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.usuario?.nome ?? "-"} - {fmtDate(e.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadEvidencia(e.caminho_arquivo, e.nome_arquivo)}
                >
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
