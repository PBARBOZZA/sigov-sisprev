import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface Props {
  require: "admin" | "manage";
  children: ReactNode;
}

export function RequireRole({ require, children }: Props) {
  const { permissionLevel, loading } = useAuth();
  if (loading) return null;
  const allowed = require === "admin"
    ? permissionLevel === "admin"
    : permissionLevel === "admin" || permissionLevel === "diretoria";
  if (!allowed) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="p-8 max-w-md text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            Você não possui permissão para acessar esta tela. Procure um administrador.
          </p>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}
