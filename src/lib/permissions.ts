export const BOOTSTRAP_ADMIN_EMAIL = "periclescep@gmail.com";

export type AppRole = "admin" | "diretoria" | "responsavel" | "conselheiro";
export type PermissionLevel = "admin" | "manage" | "responsavel";

export function isBootstrapAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}

export function getPermissionLevel(roles: AppRole[], email?: string | null): PermissionLevel {
  if (isBootstrapAdminEmail(email) || roles.includes("admin")) return "admin";
  if (roles.includes("diretoria")) return "manage";
  return "responsavel";
}

export function canAccessModule(level: PermissionLevel, module: string) {
  if (level === "admin") return true;

  const managementModules = new Set([
    "/areas",
    "/progestao",
    "/indicadores",
    "/relatorios",
    "/dashboard",
    "/minhas-acoes",
    "/plano-acao",
    "/kanban",
    "/evidencias",
    "/notificacoes",
  ]);

  const responsibleModules = new Set([
    "/dashboard",
    "/minhas-acoes",
    "/plano-acao",
    "/kanban",
    "/evidencias",
    "/notificacoes",
  ]);

  if (level === "manage") return managementModules.has(module);
  return responsibleModules.has(module);
}
