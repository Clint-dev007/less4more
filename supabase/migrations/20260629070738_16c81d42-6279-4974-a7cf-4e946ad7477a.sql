-- Auto-grant admin to designated email on signup/confirm
CREATE OR REPLACE FUNCTION public.grant_admin_for_designated_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'idehenclintonn@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_designated_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_designated_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_designated_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_designated_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_designated_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_designated_email();

-- Grant admin now if user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'idehenclintonn@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;