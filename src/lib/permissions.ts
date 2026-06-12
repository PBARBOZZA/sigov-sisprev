export const BOOTSTRAP_ADMIN_EMAIL = "periclescep@gmail.com";

export type AppRole = "admin" | "diretoria" | "responsavel" | "apoiador" | "consulta" | "conselheiro";
export type PermissionLevel = "admin" | "diretoria" | "responsavel" | "apoiador" | "consulta";

export function isBootstrapAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
}

export function getPermissionLevel(roles: AppRole[], email?: string | null): PermissionLevel {
  if (isBootstrapAdminEmail(email) || roles.includes("admin")) return "admin";
  if (roles.includes("diretoria")) return "diretoria";
  if (roles.includes("responsavel")) return "responsavel";
  if (roles.includes("apoiador")) return "apoiador";
  return "consulta";
}

export function canAccessModule(level: PermissionLevel, module: string) {
  if (level === "admin") return true;

  const visibleToAllModules = new Set([
    "/dashboard",
    "/kanban",
    "/plano-acao",
    "/minhas-acoes",
    "/indicadores",
    "/relatorios",
    "/evidencias",
    "/notificacoes",
  ]);

  if (visibleToAllModules.has(module)) return true;
  if (level === "diretoria") return module === "/progestao";
  return false;
}

export function canManageActions(level: PermissionLevel) {
  return level === "admin" || level === "diretoria";
}

export function canManageUsers(level: PermissionLevel) {
  return level === "admin";
}

export function canManageAreas(level: PermissionLevel) {
  return level === "admin";
}
