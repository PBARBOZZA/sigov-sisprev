import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/areas")({
  head: () => ({ meta: [{ title: "Áreas — SIGOV-SISPREV" }] }),
  component: Areas,
});

function Areas() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["areas-list"],
    queryFn: async () => (await supabase.from("areas").select("*").order("nome")).data ?? [],
  });

  const { data: usuarios } = useQuery({
    queryKey: ["usuarios-options-areas"],
    queryFn: async () => (await supabase.from("profiles").select("id,nome").order("nome")).data ?? [],
  });

  const [respId, setRespId] = useState<string>("");
  const [status, setStatus] = useState<string>("ativa");

  const create = useMutation({
    mutationFn: async (form: any) => { const { error } = await supabase.from("areas").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Área salva com sucesso."); qc.invalidateQueries({ queryKey: ["areas-list"] }); qc.invalidateQueries({ queryKey: ["areas-options"] }); setOpen(false); setRespId(""); setStatus("ativa"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase.from("areas").update({ status }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["areas-list"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Áreas</h1>
          <p className="text-sm text-muted-foreground">Setores institucionais do SISPREV-TO.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Área</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Área</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const nome = f.get("nome")?.toString().trim();
                if (!nome) { toast.error("Nome é obrigatório"); return; }
                create.mutate({
                  nome,
                  descricao: f.get("descricao")?.toString().trim() || null,
                  responsavel_id: respId || null,
                  status: status === "ativa",
                });
              }} className="space-y-3">
                <div><Label>Nome *</Label><Input name="nome" required /></div>
                <div><Label>Descrição</Label><Textarea name="descricao" /></div>
                <div>
                  <Label>Responsável da área</Label>
                  <Select value={respId} onValueChange={setRespId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                    <SelectContent>
                      {(usuarios ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="inativa">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data ?? []).map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">{a.nome}</p>
                    <Badge variant={a.status ? "default" : "secondary"} className="text-[10px]">
                      {a.status ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
                {isAdmin && <Switch checked={a.status} onCheckedChange={(v) => toggle.mutate({ id: a.id, status: v })} />}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{a.descricao || "Sem descrição."}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
