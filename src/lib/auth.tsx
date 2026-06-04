import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "diretoria" | "responsavel" | "conselheiro";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isDiretoria: boolean;
  canManage: boolean;
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

    const active = await isActiveProfile(s.user.id);
    if (!active) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setRoles([]);
      return;
    }

    setSession(s);
    setUser(s.user);
    await loadRoles(s.user.id);
  }

  async function isActiveProfile(uid: string) {
    const { data, error } = await supabase.from("profiles").select("status").eq("id", uid).maybeSingle();
    return !error && data?.status === true;
  }

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  }

  const isAdmin = roles.includes("admin");
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
        canManage: isAdmin || isDiretoria,
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
