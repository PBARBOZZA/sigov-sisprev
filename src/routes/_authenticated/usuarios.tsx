import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — SIGOV-SISPREV" }] }),
  component: Usuarios,
});

const ROLES: { value: string; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "diretoria", label: "Diretoria" },
  { value: "responsavel", label: "Responsável por Ação" },
  { value: "conselheiro", label: "Conselheiro / Consulta" },
];

function Usuarios() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios-list"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*, area:areas(nome)").order("nome");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles ?? []).map((p: any) => ({ ...p, role: roles?.find((r) => r.user_id === p.id)?.role ?? "responsavel" }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["usuarios-list"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie os usuários do SIGOV-SISPREV e seus perfis de acesso.</p>
        {!isAdmin && <p className="text-xs text-warning-foreground mt-1">Apenas administradores podem alterar perfis.</p>}
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
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.nome.split(" ").slice(0, 2).map((s: string) => s[0]).join("")}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">{u.cargo ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{u.area?.nome ?? "—"}</td>
                    <td className="px-3 py-2"><Badge variant={u.status ? "default" : "secondary"}>{u.status ? "Ativo" : "Inativo"}</Badge></td>
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
        Novos usuários se cadastram pela tela de login e recebem inicialmente o perfil <strong>Responsável por Ação</strong>. O Administrador ajusta o perfil aqui.
      </p>
    </div>
  );
}
