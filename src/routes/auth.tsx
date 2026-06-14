import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isBootstrapAdminEmail } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

function BrandLogo() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="flex h-12 min-w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white px-2 shadow-sm shadow-emerald-950/5">
      {logoFailed ? (
        <span className="text-[10px] font-bold tracking-[0.16em] text-emerald-800">SISPREV-TO</span>
      ) : (
        <img
          src={sisprevLogo.url}
          alt="SISPREV-TO"
          className="h-9 w-auto"
          onError={() => setLogoFailed(true)}
        />
      )}
    </div>
  );
}

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
    if (!isBootstrapAdminEmail(data.user.email) && !profile?.status) {
      await supabase.auth.signOut();
      toast.error("Usuario inativo. Procure um administrador.");
      return;
    }

    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbfdfb_0%,#eef7f1_100%)] text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_440px] lg:px-10">
        <section className="mx-auto flex w-full max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-8 flex items-center gap-4">
            <BrandLogo />
            <div>
              <p className="text-xl font-semibold tracking-tight text-emerald-950">SIGOV-SISPREV</p>
              <p className="text-sm text-emerald-900/70">SISPREV-TO</p>
            </div>
          </div>

          <div className="space-y-5">
            <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Sistema Integrado de Governança Previdenciária
            </h1>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-700">
              Planejamento • Governança • Resultados
            </p>
          </div>
        </section>

        <Card className="w-full border-emerald-950/10 bg-white/95 p-6 shadow-2xl shadow-emerald-950/10 backdrop-blur sm:p-8">
          <div className="mb-8 space-y-2">
            <p className="text-2xl font-semibold tracking-tight text-slate-950">Bem-vindo</p>
            <p className="text-sm text-muted-foreground">Acesse sua conta institucional</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="li-email" className="text-slate-700">
                E-mail
              </Label>
              <Input
                id="li-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 shadow-none transition focus-visible:ring-2 focus-visible:ring-emerald-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="li-pwd" className="text-slate-700">
                Senha
              </Label>
              <Input
                id="li-pwd"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 px-4 shadow-none transition focus-visible:ring-2 focus-visible:ring-emerald-600"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-emerald-700 font-semibold shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800"
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Acessar sistema
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
