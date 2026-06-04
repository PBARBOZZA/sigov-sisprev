import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createUsuarioSchema, updateUsuarioSchema } from "@/lib/security-schemas";

async function assertAdmin(supabase: any, userId: string) {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw new Error("Falha ao validar perfil do usuario.");

  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) throw new Error("Apenas administradores podem gerenciar usuarios.");
}

export const createUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(createUsuarioSchema)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.area_id) {
      const { data: area, error: areaError } = await supabaseAdmin
        .from("areas")
        .select("id")
        .eq("id", data.area_id)
        .maybeSingle();
      if (areaError || !area) throw new Error("Area informada nao existe.");
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (createError || !created.user) throw new Error(createError?.message || "Falha ao criar usuario.");

    const newId = created.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        cargo: data.cargo,
        area_id: data.area_id,
        status: data.status,
        nome: data.nome,
      })
      .eq("id", newId);
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newId, role: data.role }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId).neq("role", data.role);

    return { id: newId };
  });

export const updateUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(updateUsuarioSchema)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.area_id) {
      const { data: area, error: areaError } = await supabaseAdmin
        .from("areas")
        .select("id")
        .eq("id", data.area_id)
        .maybeSingle();
      if (areaError || !area) throw new Error("Area informada nao existe.");
    }

    const profilePatch: Record<string, unknown> = {};
    if (data.nome !== undefined) profilePatch.nome = data.nome;
    if (data.cargo !== undefined) profilePatch.cargo = data.cargo;
    if (data.area_id !== undefined) profilePatch.area_id = data.area_id;
    if (data.status !== undefined) profilePatch.status = data.status;

    if (Object.keys(profilePatch).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profilePatch as any)
        .eq("id", data.id);
      if (profileError) throw new Error(profileError.message);
    }

    if (data.role) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.id, role: data.role }, { onConflict: "user_id,role" });
      if (roleError) throw new Error(roleError.message);

      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id).neq("role", data.role);
    }

    return { id: data.id };
  });
