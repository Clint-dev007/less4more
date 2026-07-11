
-- ============ RPC: admin top-up user balance ============
CREATE OR REPLACE FUNCTION public.admin_topup_user_balance(
  _user_id UUID,
  _amount NUMERIC,
  _note TEXT DEFAULT ''
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID;
  v_name TEXT;
BEGIN
  v_admin := auth.uid();
  IF NOT public.has_role(v_admin, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Get user name for notification
  SELECT name INTO v_name FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found'; END IF;

  -- Credit balance
  UPDATE public.profiles SET balance = balance + _amount WHERE id = _user_id;

  -- Notify the user
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_user_id, 'admin_topup', 'Balance topped up!',
    '₦' || _amount::TEXT || ' has been credited to your wallet by admin.' ||
    CASE WHEN _note <> '' THEN ' Note: ' || _note ELSE '' END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_topup_user_balance(UUID, NUMERIC, TEXT) TO authenticated;
