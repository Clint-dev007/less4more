CREATE OR REPLACE FUNCTION public.count_qualified_referrals(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT r.referee_id)::int
  FROM public.referrals r
  WHERE r.referrer_id = _user_id
    AND EXISTS (SELECT 1 FROM public.investments i WHERE i.user_id = r.referee_id);
$$;

CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount numeric, _payout_day text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p RECORD; new_id UUID; qualified INT;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF p.balance < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  IF p.bank_name IS NULL OR p.account_no IS NULL THEN RAISE EXCEPTION 'add bank account first'; END IF;

  SELECT public.count_qualified_referrals(auth.uid()) INTO qualified;
  IF qualified < 2 THEN
    RAISE EXCEPTION 'You need at least 2 referrals who have invested before you can withdraw. You currently have % qualified referral(s).', qualified;
  END IF;

  UPDATE public.profiles SET balance = balance - _amount WHERE id = auth.uid();
  INSERT INTO public.withdrawals (user_id, amount, payout_day, bank_name, account_no, account_name)
  VALUES (auth.uid(), _amount, _payout_day, p.bank_name, p.account_no, p.account_name)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.count_qualified_referrals(uuid) TO authenticated;