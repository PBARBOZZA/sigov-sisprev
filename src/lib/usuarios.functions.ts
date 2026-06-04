import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateUserInput = {
  email: string;
  nome: string;
  password: string;
  cargo?: string | null;
  area_id?: string | null;
  role: "admin" | "diretoria" | "responsavel" | "conselheiro";
  status?: boolean;
};

export const createUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateUserInput) => d)
  .handler(async ({ data, context }) => {
    // Only admins can create users
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Apenas administradores podem cadastrar usuários.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (cErr || !created.user) throw new Error(cErr?.message || "Falha ao criar usuário");

    const newId = created.user.id;

    // Trigger handle_new_user already inserted profile + default role.
    // Update profile with cargo/area/status.
    await supabaseAdmin
      .from("profiles")
      .update({
        cargo: data.cargo ?? null,
        area_id: data.area_id ?? null,
        status: data.status ?? true,
        nome: data.nome,
      })
      .eq("id", newId);

    // Replace default role with the chosen one
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (rErr) throw new Error(rErr.message);

    return { id: newId };
  });
