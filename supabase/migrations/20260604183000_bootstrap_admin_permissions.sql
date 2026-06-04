-- Bootstrap administrator and permission helpers.

CREATE OR REPLACE FUNCTION public.is_bootstrap_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'periclescep@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (_role = 'admin'::public.app_role AND public.is_bootstrap_admin(_user_id))
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_diretoria(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_bootstrap_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN ('admin', 'diretoria')
    )
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_bootstrap_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _user_id
        AND status = true
    )
$$;

GRANT EXECUTE ON FUNCTION public.is_bootstrap_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_diretoria(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_bootstrap_admin(uuid) FROM anon;

INSERT INTO public.profiles (id, nome, email, status)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  u.email,
  true
FROM auth.users u
WHERE lower(u.email) = 'periclescep@gmail.com'
ON CONFLICT (id) DO UPDATE
SET status = true,
    nome = COALESCE(EXCLUDED.nome, public.profiles.nome),
    email = EXCLUDED.email;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'periclescep@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

