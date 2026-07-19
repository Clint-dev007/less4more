-- Add Paystack columns to deposits table (keeping Flutterwave columns for historical data)
ALTER TABLE public.deposits 
  ADD COLUMN IF NOT EXISTS psk_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS psk_tx_id TEXT;

-- Create RPC function for Paystack auto-credit
CREATE OR REPLACE FUNCTION public.credit_deposit_by_psk_ref(
  _psk_reference TEXT, _psk_tx_id TEXT, _amount NUMERIC
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM public.deposits WHERE psk_reference = _psk_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit not found'; END IF;
  IF r.status = 'approved' THEN RETURN; END IF;
  UPDATE public.deposits 
    SET status = 'approved', decided_at = now(), 
        psk_tx_id = _psk_tx_id, amount = _amount 
  WHERE id = r.id;
  UPDATE public.profiles SET balance = balance + _amount WHERE id = r.user_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (r.user_id, 'deposit_approved', 'Deposit approved',
    'Your deposit of ₦' || _amount::TEXT || ' has been credited automatically.');
END;
$$;
