import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import sisprevLogo from "@/assets/sisprev-logo.png.asset.json";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar - SIGOV-SISPREV" }] }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail invalido").max(255),
  password: z.string().min(6, "Minimo 6 caracteres").max(72),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data.user) {
      toast.error("Sessao invalida.");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
    if (!profile?.status) {
      await supabase.auth.signOut();
      toast.error("Usuario inativo. Procure um administrador.");
      return;
    }

    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <img src={sisprevLogo.url} alt="SISPREV-TO" className="h-16 w-auto" />
          <div>
            <p className="text-lg font-semibold">SIGOV-SISPREV</p>
            <p className="text-xs text-sidebar-foreground/70">Governanca Previdenciaria</p>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight">
            Sistema Integrado de Governanca Previdenciaria
          </h1>
          <p className="text-sidebar-foreground/80 max-w-md">
            Controle do Plano de Gestao Anual, Pro-Gestao RPPS, indicadores, evidencias
            e responsabilidades do SISPREV-TO.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">SISPREV-TO</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src={sisprevLogo.url} alt="SISPREV-TO" className="h-14 w-auto" />
            <div>
              <p className="font-semibold">SIGOV-SISPREV</p>
              <p className="text-xs text-muted-foreground">Governanca Previdenciaria</p>
            </div>
          </div>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="li-email">E-mail</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="li-pwd">Senha</Label>
                  <Input id="li-pwd" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <div className="space-y-4 pt-4">
                <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                  O cadastro publico esta desabilitado. Novos usuarios devem ser criados por um administrador no modulo Usuarios.
                </div>
                <Button type="button" className="w-full" disabled>
                  Cadastro somente por administrador
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
