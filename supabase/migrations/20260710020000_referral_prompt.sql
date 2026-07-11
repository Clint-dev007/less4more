
-- Add referral_prompted column to track if Google-signup users have been prompted
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_prompted BOOLEAN NOT NULL DEFAULT false;

-- RPC to apply a referral code (one-time, after Google signup)
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user RECORD;
  v_referrer UUID;
BEGIN
  SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF v_user.referral_prompted THEN RAISE EXCEPTION 'already prompted'; END IF;
  IF v_user.referred_by IS NOT NULL THEN RAISE EXCEPTION 'referral already applied'; END IF;

  SELECT id INTO v_referrer FROM public.profiles WHERE ref_code = UPPER(_code) LIMIT 1;
  IF v_referrer IS NULL THEN RAISE EXCEPTION 'invalid referral code'; END IF;
  IF v_referrer = auth.uid() THEN RAISE EXCEPTION 'cannot refer yourself'; END IF;

  UPDATE public.profiles SET referred_by = v_referrer, referral_prompted = true WHERE id = auth.uid();
  INSERT INTO public.referrals (referrer_id, referee_id) VALUES (v_referrer, auth.uid()) ON CONFLICT DO NOTHING;
END;
$$;

-- RPC to skip referral prompt
CREATE OR REPLACE FUNCTION public.skip_referral_prompt()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET referral_prompted = true WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_referral_prompt() TO authenticated;

-- Set referral_prompted = true for existing users who already have a referral or were manually signed up
UPDATE public.profiles SET referral_prompted = true WHERE referred_by IS NOT NULL;
