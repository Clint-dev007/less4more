CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
  v_referrer UUID;
  v_ref_input TEXT;
BEGIN
  v_code := 'L4M' || UPPER(SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 6));
  v_ref_input := NEW.raw_user_meta_data->>'referral_code';
  IF v_ref_input IS NOT NULL AND v_ref_input <> '' THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE ref_code = UPPER(v_ref_input) LIMIT 1;
  END IF;
  INSERT INTO public.profiles (id, name, phone, ref_code, referred_by, referral_prompted)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone',
    v_code,
    v_referrer,
    v_referrer IS NOT NULL
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF v_referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referee_id) VALUES (v_referrer, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
