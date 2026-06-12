import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  canManageActions,
  getPermissionLevel,
  isBootstrapAdminEmail,
  type AppRole,
  type PermissionLevel,
} from "@/lib/permissions";

export type { AppRole } from "@/lib/permissions";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isDiretoria: boolean;
  canManage: boolean;
  permissionLevel: PermissionLevel;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      void applySession(s);
    });

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session).finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function applySession(s: Session | null) {
    if (!s?.user) {
      setSession(null);
      setUser(null);
      setRoles([]);
      return;
    }

    const active = await isActiveProfile(s.user.id, s.user.email);
    if (!active) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setRoles([]);
      return;
    }

    setSession(s);
    setUser(s.user);
    await loadRoles(s.user.id, s.user.email);
  }

  async function isActiveProfile(uid: string, email?: string | null) {
    if (isBootstrapAdminEmail(email)) return true;
    const { data, error } = await supabase.from("profiles").select("status").eq("id", uid).maybeSingle();
    return !error && data?.status === true;
  }

  async function loadRoles(uid: string, email?: string | null) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const loadedRoles = (data ?? []).map((r) => r.role as AppRole);
    setRoles(isBootstrapAdminEmail(email) && !loadedRoles.includes("admin") ? [...loadedRoles, "admin"] : loadedRoles);
  }

  const permissionLevel = getPermissionLevel(roles, user?.email);
  const isAdmin = permissionLevel === "admin";
  const isDiretoria = roles.includes("diretoria");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roles,
        isAdmin,
        isDiretoria,
        canManage: canManageActions(permissionLevel),
        permissionLevel,
        signOut: async () => { await supabase.auth.signOut(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
