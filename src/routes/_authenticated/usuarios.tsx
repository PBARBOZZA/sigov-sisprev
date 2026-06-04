import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createUsuario, updateUsuario } from "@/lib/usuarios.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — SIGOV-SISPREV" }] }),
  component: Usuarios,
});

const ROLES: { value: "admin" | "diretoria" | "responsavel" | "conselheiro"; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "diretoria", label: "Diretoria" },
  { value: "responsavel", label: "Responsável por Ação" },
  { value: "conselheiro", label: "Conselheiro / Consulta" },
];

function Usuarios() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const createFn = useServerFn(createUsuario);
  const updateFn = useServerFn(updateUsuario);

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios-list"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*, area:areas(nome)").order("nome");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles ?? []).map((p: any) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "responsavel",
      }));
    },
  });

  const { data: areas } = useQuery({
    queryKey: ["areas-options-usuarios"],
    queryFn: async () => (await supabase.from("areas").select("id,nome").order("nome")).data ?? [],
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await updateFn({ data: { id: userId, role: role as any } });
    },
    onSuccess: () => { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["usuarios-list"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      await updateFn({ data: { id, status } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios-list"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async (form: any) => createFn({ data: form }),
    onSuccess: () => {
      toast.success("Usuário salvo com sucesso.");
      qc.invalidateQueries({ queryKey: ["usuarios-list"] });
      qc.invalidateQueries({ queryKey: ["usuarios-options"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar usuário"),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => f.get(k)?.toString().trim() || "";
    const payload = {
      nome: get("nome"),
      email: get("email"),
      password: get("password"),
      cargo: get("cargo") || null,
      area_id: get("area_id") || null,
      role: (get("role") || "responsavel") as any,
      status: get("status") === "ativo",
    };
    if (!payload.nome || !payload.email || !payload.password) {
      toast.error("Nome, e-mail e senha são obrigatórios.");
      return;
    }
    if (payload.password.length < 8) {
      toast.error("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    createMutation.mutate(payload);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie os usuários do SIGOV-SISPREV e seus perfis de acesso.</p>
          {!isAdmin && <p className="text-xs text-warning-foreground mt-1">Apenas administradores podem cadastrar ou alterar perfis.</p>}
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Nome completo *</Label><Input name="nome" required /></div>
                  <div><Label>E-mail *</Label><Input name="email" type="email" required /></div>
                  <div><Label>Senha inicial *</Label><Input name="password" type="password" minLength={8} required /></div>
                  <div><Label>Cargo</Label><Input name="cargo" /></div>
                  <div>
                    <Label>Área</Label>
                    <SelectInput name="area_id" placeholder="Selecione" options={(areas ?? []).map(a => ({ value: a.id, label: a.nome }))} />
                  </div>
                  <div>
                    <Label>Perfil de acesso *</Label>
                    <SelectInput name="role" defaultValue="responsavel" placeholder="Selecione"
                      options={ROLES.map(r => ({ value: r.value, label: r.label }))} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <SelectInput name="status" defaultValue="ativo" placeholder="Status"
                      options={[{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }]} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
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
          <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs uppercase text-muted-foreground">Usuário</th>
                  <th className="px-3 py-2 text-xs uppercase text-muted-foreground">Cargo</th>
                  <th className="px-3 py-2 text-xs uppercase text-muted-foreground">Área</th>
                  <th className="px-3 py-2 text-xs uppercase text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-xs uppercase text-muted-foreground">Perfil</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-accent/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {u.nome.split(" ").slice(0, 2).map((s: string) => s[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{u.cargo ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{u.area?.nome ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={u.status ? "default" : "secondary"}>{u.status ? "Ativo" : "Inativo"}</Badge>
                        {isAdmin && (
                          <Switch checked={u.status} onCheckedChange={(v) => toggleStatus.mutate({ id: u.id, status: v })} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {isAdmin ? (
                        <Select value={u.role} onValueChange={(v) => setRole.mutate({ userId: u.id, role: v })}>
                          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <Badge variant="outline">{ROLES.find(r => r.value === u.role)?.label}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">
        Usuários cadastrados aqui já ficam disponíveis no campo <strong>Responsável</strong> do cadastro de ações.
      </p>
    </div>
  );
}

function SelectInput({ name, options, defaultValue, placeholder }: {
  name: string; options: { value: string; label: string }[]; defaultValue?: string; placeholder?: string;
}) {
  const [v, setV] = useState(defaultValue ?? "");
  return (
    <>
      <input type="hidden" name={name} value={v} />
      <Select value={v} onValueChange={setV}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </>
  );
}
