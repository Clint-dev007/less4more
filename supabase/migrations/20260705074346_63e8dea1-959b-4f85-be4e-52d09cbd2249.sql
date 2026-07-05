
-- Restrict profiles: drop the broad leaderboard read policy, expose only safe columns via a view
DROP POLICY IF EXISTS "leaderboard read" ON public.profiles;

CREATE OR REPLACE VIEW public.public_leaderboard
WITH (security_invoker = true) AS
SELECT id, name, invested, ref_code
FROM public.profiles;

GRANT SELECT ON public.public_leaderboard TO authenticated;

-- Because the view uses security_invoker, it needs a SELECT policy on profiles for leaderboard rows.
CREATE POLICY "leaderboard public columns" ON public.profiles
FOR SELECT TO authenticated USING (true);
-- NOTE: This still exposes rows via profiles directly. Replace with a definer function instead.
DROP POLICY IF EXISTS "leaderboard public columns" ON public.profiles;

-- Better: expose leaderboard via SECURITY DEFINER function that returns only safe columns
DROP VIEW IF EXISTS public.public_leaderboard;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE(id uuid, name text, invested numeric, ref_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, invested, ref_code
  FROM public.profiles
  ORDER BY invested DESC
  LIMIT COALESCE(_limit, 20);
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO authenticated;

-- Lock down user_roles writes: only admins may INSERT/UPDATE/DELETE roles
CREATE POLICY "admins insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
