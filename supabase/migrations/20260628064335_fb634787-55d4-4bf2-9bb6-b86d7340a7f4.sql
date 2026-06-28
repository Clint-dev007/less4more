
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.investment_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.plan_category AS ENUM ('thrift', 'agriculture', 'property', 'finance');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  invested NUMERIC(14,2) NOT NULL DEFAULT 0,
  returns NUMERIC(14,2) NOT NULL DEFAULT 0,
  ref_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active',
  bank_name TEXT,
  account_no TEXT,
  account_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Profile policies (now that has_role exists)
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Leaderboard view (public read of limited columns)
CREATE POLICY "leaderboard read" ON public.profiles FOR SELECT TO authenticated USING (true);

-- ============ PLANS ============
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💰',
  category plan_category NOT NULL,
  roi NUMERIC(6,2) NOT NULL,
  duration_days INT NOT NULL,
  min_amount NUMERIC(14,2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed read plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ INVESTMENTS ============
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  amount NUMERIC(14,2) NOT NULL,
  expected_return NUMERIC(14,2) NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  status investment_status NOT NULL DEFAULT 'active'
);
GRANT SELECT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own investments" ON public.investments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ DEPOSITS ============
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  ref TEXT NOT NULL,
  status deposit_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own deposits" ON public.deposits FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users create own deposits" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ WITHDRAWALS ============
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  payout_day TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_no TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users create own withdrawals" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own notifs" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users update own notifs" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ============ ADMIN SETTINGS ============
CREATE TABLE public.admin_settings (
  id INT PRIMARY KEY DEFAULT 1,
  bank_name TEXT NOT NULL DEFAULT '',
  account_no TEXT NOT NULL DEFAULT '',
  account_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_settings_singleton CHECK (id = 1)
);
INSERT INTO public.admin_settings (id, bank_name, account_no, account_name)
  VALUES (1, 'Access Bank', '0123456789', 'Less4More Investments Ltd');
GRANT SELECT ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed read settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update settings" ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referee_id)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id OR public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGER: auto-create profile + assign 'user' role on signup ============
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
  INSERT INTO public.profiles (id, name, phone, ref_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone',
    v_code,
    v_referrer
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF v_referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referee_id) VALUES (v_referrer, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RPC: approve deposit ============
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.deposits WHERE id = _deposit_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit not found or not pending'; END IF;
  UPDATE public.profiles SET balance = balance + r.amount WHERE id = r.user_id;
  UPDATE public.deposits SET status = 'approved', decided_at = now() WHERE id = _deposit_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (r.user_id, 'deposit_approved', 'Deposit approved',
    'Your deposit of ₦' || r.amount::TEXT || ' has been credited.');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_deposit(_deposit_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.deposits WHERE id = _deposit_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.deposits SET status = 'rejected', decided_at = now() WHERE id = _deposit_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (r.user_id, 'deposit_rejected', 'Deposit rejected', 'Your deposit was rejected. Contact support.');
END;
$$;

-- ============ RPC: approve/reject withdrawal ============
CREATE OR REPLACE FUNCTION public.approve_withdrawal(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.withdrawals WHERE id = _id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.withdrawals SET status = 'approved', decided_at = now() WHERE id = _id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (r.user_id, 'withdrawal_approved', 'Withdrawal sent',
    'Your withdrawal of ₦' || r.amount::TEXT || ' has been processed.');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.withdrawals WHERE id = _id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.withdrawals SET status = 'rejected', decided_at = now() WHERE id = _id;
  UPDATE public.profiles SET balance = balance + r.amount WHERE id = r.user_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (r.user_id, 'withdrawal_rejected', 'Withdrawal rejected',
    'Your withdrawal was rejected and funds returned to your wallet.');
END;
$$;

-- ============ RPC: create withdrawal (deducts balance atomically) ============
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount NUMERIC, _payout_day TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; new_id UUID;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF p.balance < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  IF p.bank_name IS NULL OR p.account_no IS NULL THEN RAISE EXCEPTION 'add bank account first'; END IF;
  UPDATE public.profiles SET balance = balance - _amount WHERE id = auth.uid();
  INSERT INTO public.withdrawals (user_id, amount, payout_day, bank_name, account_no, account_name)
  VALUES (auth.uid(), _amount, _payout_day, p.bank_name, p.account_no, p.account_name)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- ============ RPC: invest in plan ============
CREATE OR REPLACE FUNCTION public.create_investment(_plan_id UUID, _amount NUMERIC)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pl RECORD; pr RECORD; new_id UUID; v_return NUMERIC;
  v_first BOOLEAN; v_ref UUID;
BEGIN
  SELECT * INTO pl FROM public.plans WHERE id = _plan_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan unavailable'; END IF;
  IF _amount < pl.min_amount THEN RAISE EXCEPTION 'amount below minimum'; END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF pr.balance < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  v_return := _amount * (1 + pl.roi/100);
  SELECT NOT EXISTS(SELECT 1 FROM public.investments WHERE user_id = auth.uid()) INTO v_first;

  UPDATE public.profiles
    SET balance = balance - _amount, invested = invested + _amount
    WHERE id = auth.uid();

  INSERT INTO public.investments (user_id, plan_id, amount, expected_return, end_at)
  VALUES (auth.uid(), _plan_id, _amount, v_return, now() + (pl.duration_days || ' days')::INTERVAL)
  RETURNING id INTO new_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (auth.uid(), 'invested', 'Investment created',
    'You invested ₦' || _amount::TEXT || ' in ' || pl.name);

  -- referral bonus on FIRST investment
  IF v_first AND pr.referred_by IS NOT NULL THEN
    v_ref := pr.referred_by;
    UPDATE public.profiles SET balance = balance + (_amount * 0.10) WHERE id = v_ref;
    UPDATE public.referrals SET bonus_paid = bonus_paid + (_amount * 0.10)
      WHERE referee_id = auth.uid();
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (v_ref, 'referral_bonus', 'Referral bonus earned!',
      'You earned ₦' || (_amount * 0.10)::TEXT || ' from a referral.');
  END IF;
  RETURN new_id;
END;
$$;

-- ============ RPC: claim first admin (one-time bootstrap) ============
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'admin already exists';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT DO NOTHING;
END;
$$;

-- ============ SEED PLANS ============
INSERT INTO public.plans (name, icon, category, roi, duration_days, min_amount, description) VALUES
('Fixed Thrift 30', '🏦', 'thrift', 12, 30, 5000, 'Lock funds for 30 days and earn 12% return.'),
('Fixed Thrift 90', '💎', 'thrift', 40, 90, 20000, 'Premium 90-day thrift with 40% returns.'),
('AgroHarvest', '🌽', 'agriculture', 25, 60, 10000, 'Back maize and cassava harvests across Nigeria.'),
('PropertyFlip', '🏘️', 'property', 35, 120, 50000, 'Lagos short-let property profit share.'),
('FinanceBoost', '📈', 'finance', 18, 45, 8000, 'Micro-lending pool with steady weekly returns.');

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
