
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS flw_tx_ref TEXT UNIQUE;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS flw_tx_id TEXT;

CREATE OR REPLACE FUNCTION public.credit_deposit_by_ref(_tx_ref TEXT, _tx_id TEXT, _amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM public.deposits WHERE flw_tx_ref = _tx_ref FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit not found'; END IF;
  IF r.status = 'approved' THEN RETURN; END IF;
  UPDATE public.deposits SET status = 'approved', decided_at = now(), flw_tx_id = _tx_id, amount = _amount WHERE id = r.id;
  UPDATE public.profiles SET balance = balance + _amount WHERE id = r.user_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (r.user_id, 'deposit_approved', 'Deposit approved',
    'Your deposit of ₦' || _amount::TEXT || ' has been credited automatically.');
END;
$$;
