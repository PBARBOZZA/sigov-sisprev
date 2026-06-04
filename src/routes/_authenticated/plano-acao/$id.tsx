import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Loader2, ArrowLeft, Save, Trash2, Upload, FileText, Download } from "lucide-react";
import { STATUS_LABELS, PRIORIDADE_LABELS, fmtDate, prazoCor } from "@/lib/acao-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plano-acao/$id")({
  head: () => ({ meta: [{ title: "Detalhes da Ação — SIGOV-SISPREV" }] }),
  component: AcaoDetalhes,
});

function AcaoDetalhes() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: acao, isLoading } = useQuery({
    queryKey: ["acao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acoes")
        .select("*, area:areas(id,nome), responsavel:profiles!acoes_responsavel_id_fkey(id,nome,email)")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: evidencias } = useQuery({
    queryKey: ["evidencias", id],
    queryFn: async () => (await supabase.from("evidencias").select("*, usuario:profiles(nome)").eq("acao_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (acao) setForm(acao); }, [acao]);

  const updateMutation = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("acoes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação atualizada");
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
      toast.success("Ação excluída");
      qc.invalidateQueries({ queryKey: ["acoes-list"] });
      navigate({ to: "/plano-acao" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("evidencias").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { error: insErr } = await supabase.from("evidencias").insert({
      acao_id: id, usuario_id: user.id, nome_arquivo: file.name,
      caminho_arquivo: path, tipo_arquivo: file.type,
    });
    setUploading(false);
    if (insErr) { toast.error(insErr.message); return; }
    toast.success("Evidência enviada");
    qc.invalidateQueries({ queryKey: ["evidencias", id] });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function downloadEvidencia(path: string, nome: string) {
    const { data, error } = await supabase.storage.from("evidencias").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Erro ao gerar link"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = nome; a.click();
  }

  if (isLoading || !form) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>;
  if (!acao) return <p>Ação não encontrada.</p>;

  const pz = prazoCor(form.prazo_final, form.status);
  const canEdit = isAdmin || acao.responsavel_id === user?.id;

  function update(patch: Partial<typeof form>) { setForm({ ...form, ...patch }); }
  function save() { const { id: _id, area, responsavel, created_at, updated_at, ...rest } = form; updateMutation.mutate(rest); }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link to="/plano-acao" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Link>
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir esta ação?")) deleteMutation.mutate(); }}>
            <Trash2 className="h-4 w-4 mr-1 text-destructive" />Excluir
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground">{acao.codigo}</p>
            <h1 className="text-2xl font-bold">{acao.titulo}</h1>
            <p className="text-sm text-muted-foreground mt-1">{acao.eixo_estrategico ?? "—"} · {(acao as any).area?.nome ?? "—"}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{STATUS_LABELS[form.status]}</Badge>
            <Badge variant="outline">{PRIORIDADE_LABELS[form.prioridade]}</Badge>
            {pz.dias !== null && <Badge className={pz.color}>{pz.label}</Badge>}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Execução</p>
            <p className="text-sm font-bold text-primary">{form.percentual_execucao}%</p>
          </div>
          <Progress value={form.percentual_execucao} />
          {canEdit && (
            <Slider value={[form.percentual_execucao]} max={100} step={5}
              onValueChange={(v) => update({ percentual_execucao: v[0] })} />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update({ status: v })} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.prioridade} onValueChange={(v) => update({ prioridade: v })} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORIDADE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data início</Label>
            <Input type="date" value={form.data_inicio ?? ""} onChange={(e) => update({ data_inicio: e.target.value })} disabled={!canEdit} />
          </div>
          <div>
            <Label>Prazo final</Label>
            <Input type="date" value={form.prazo_final ?? ""} onChange={(e) => update({ prazo_final: e.target.value })} disabled={!canEdit} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao ?? ""} onChange={(e) => update({ descricao: e.target.value })} rows={3} disabled={!canEdit} />
          </div>
          <div>
            <Label>Objetivo</Label>
            <Textarea value={form.objetivo ?? ""} onChange={(e) => update({ objetivo: e.target.value })} rows={2} disabled={!canEdit} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes ?? ""} onChange={(e) => update({ observacoes: e.target.value })} rows={3} disabled={!canEdit} />
          </div>
        </div>

        {canEdit && (
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar alterações
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t text-xs">
          <Info label="Responsável" value={(acao as any).responsavel?.nome ?? (acao as any).responsavel_nome ?? "—"} />
          <Info label="E-mail" value={(acao as any).responsavel?.email ?? "—"} />
          <Info label="Programa" value={acao.programa ?? "—"} />
          <Info label="Última atualização" value={fmtDate(acao.updated_at)} />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Evidências</h3>
          <div>
            <input ref={fileRef} type="file" hidden onChange={handleUpload} accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Anexar evidência
            </Button>
          </div>
        </div>
        {(evidencias ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma evidência anexada.</p>
        ) : (
          <ul className="space-y-2">
            {evidencias?.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">{e.usuario?.nome ?? "—"} · {fmtDate(e.created_at)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => downloadEvidencia(e.caminho_arquivo, e.nome_arquivo)}>
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
