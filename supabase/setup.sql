-- ============================================================
-- LESS4MORE - Complete Database Setup
-- Run this ONCE on a fresh Supabase project
-- ============================================================

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.investment_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.plan_category AS ENUM ('thrift', 'agriculture', 'property', 'finance', 'poultry');
CREATE TYPE public.thrift_plan_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.thrift_contrib_status AS ENUM ('paid', 'missed', 'caught_up', 'pending');

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
  subtype TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

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

-- ============ DEPOSITS ============
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  ref TEXT NOT NULL,
  status deposit_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'manual',
  flw_tx_ref TEXT UNIQUE,
  flw_tx_id TEXT,
  receipt_url TEXT
);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

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

-- ============ THRIFT FEE SETTINGS ============
CREATE TABLE public.thrift_fee_settings (
  cycle_length INT PRIMARY KEY,
  fee_percent NUMERIC NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.thrift_fee_settings TO authenticated;
GRANT ALL ON public.thrift_fee_settings TO service_role;
ALTER TABLE public.thrift_fee_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.thrift_fee_settings (cycle_length, fee_percent) VALUES (30, 5), (60, 4), (90, 3);

-- ============ THRIFT PLANS ============
CREATE TABLE public.thrift_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_amount NUMERIC NOT NULL CHECK (daily_amount > 0),
  cycle_length INT NOT NULL CHECK (cycle_length > 0),
  fee_percent NUMERIC NOT NULL,
  auto_debit BOOLEAN NOT NULL DEFAULT false,
  start_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  status public.thrift_plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.thrift_plans TO authenticated;
GRANT ALL ON public.thrift_plans TO service_role;
ALTER TABLE public.thrift_plans ENABLE ROW LEVEL SECURITY;

-- ============ THRIFT CONTRIBUTIONS ============
CREATE TABLE public.thrift_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.thrift_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contrib_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status public.thrift_contrib_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  UNIQUE (plan_id, contrib_date)
);
GRANT SELECT, INSERT, UPDATE ON public.thrift_contributions TO authenticated;
GRANT ALL ON public.thrift_contributions TO service_role;
ALTER TABLE public.thrift_contributions ENABLE ROW LEVEL SECURITY;

-- ============ THRIFT PAYOUTS ============
CREATE TABLE public.thrift_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.thrift_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_saved NUMERIC NOT NULL,
  fee_deducted NUMERIC NOT NULL,
  payout_amount NUMERIC NOT NULL,
  payout_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.thrift_payouts TO authenticated;
GRANT ALL ON public.thrift_payouts TO service_role;
ALTER TABLE public.thrift_payouts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- User Roles
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Plans
CREATE POLICY "anyone authed read plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Investments
CREATE POLICY "users see own investments" ON public.investments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Deposits
CREATE POLICY "users see own deposits" ON public.deposits FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users create own deposits" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Withdrawals
CREATE POLICY "users see own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users create own withdrawals" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "users see own notifs" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users update own notifs" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Admin Settings
CREATE POLICY "anyone authed read settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update settings" ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Referrals
CREATE POLICY "users see own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id OR public.has_role(auth.uid(), 'admin'));

-- Thrift Fee Settings
CREATE POLICY "auth read fees" ON public.thrift_fee_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write fees" ON public.thrift_fee_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Thrift Plans
CREATE POLICY "own plans" ON public.thrift_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own plans" ON public.thrift_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own plans" ON public.thrift_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Thrift Contributions
CREATE POLICY "own contribs" ON public.thrift_contributions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Thrift Payouts
CREATE POLICY "own payouts" ON public.thrift_payouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- FUNCTIONS (RPCs)
-- ============================================================

-- ============ has_role ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ handle_new_user (auto-create profile + role on signup) ============
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ grant_admin_for_designated_email ============
CREATE OR REPLACE FUNCTION public.grant_admin_for_designated_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- ============ approve_deposit ============
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

-- ============ reject_deposit ============
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

-- ============ approve_withdrawal ============
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

-- ============ reject_withdrawal ============
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

-- ============ count_qualified_referrals ============
CREATE OR REPLACE FUNCTION public.count_qualified_referrals(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT r.referee_id)::int
  FROM public.referrals r
  WHERE r.referrer_id = _user_id
    AND EXISTS (SELECT 1 FROM public.investments i WHERE i.user_id = r.referee_id);
$$;

-- ============ create_withdrawal ============
CREATE OR REPLACE FUNCTION public.create_withdrawal(_amount numeric, _payout_day text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
$$;

-- ============ create_investment ============
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

-- ============ credit_deposit_by_ref (Flutterwave auto-credit) ============
CREATE OR REPLACE FUNCTION public.credit_deposit_by_ref(_tx_ref TEXT, _tx_id TEXT, _amount NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- ============ get_leaderboard ============
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit int DEFAULT 20)
RETURNS TABLE(id uuid, name text, invested numeric, ref_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, invested, ref_code
  FROM public.profiles
  ORDER BY invested DESC
  LIMIT COALESCE(_limit, 20);
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(int) FROM PUBLIC, anon;

-- ============ claim_first_admin ============
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

-- ============ THRIFT FUNCTIONS ============

-- Create thrift plan
CREATE OR REPLACE FUNCTION public.create_thrift_plan(_daily NUMERIC, _cycle INT, _auto BOOLEAN)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID; v_fee NUMERIC;
BEGIN
  IF _daily <= 0 THEN RAISE EXCEPTION 'invalid daily amount'; END IF;
  IF _cycle NOT IN (30, 60, 90) THEN RAISE EXCEPTION 'cycle must be 30, 60 or 90'; END IF;
  SELECT fee_percent INTO v_fee FROM public.thrift_fee_settings WHERE cycle_length = _cycle;
  IF v_fee IS NULL THEN v_fee := 5; END IF;
  INSERT INTO public.thrift_plans (user_id, daily_amount, cycle_length, fee_percent, auto_debit)
  VALUES (auth.uid(), _daily, _cycle, v_fee, COALESCE(_auto, false))
  RETURNING id INTO new_id;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (auth.uid(), 'thrift_created', 'Thrift plan started',
    'Your ' || _cycle || '-day thrift plan of ₦' || _daily::TEXT || '/day is active.');
  RETURN new_id;
END; $$;

-- Thrift contribute
CREATE OR REPLACE FUNCTION public.thrift_contribute(_plan_id UUID, _date DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; pr RECORD; v_today DATE := (now() AT TIME ZONE 'UTC')::date;
        v_status public.thrift_contrib_status; v_end DATE;
BEGIN
  SELECT * INTO p FROM public.thrift_plans WHERE id = _plan_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan not found'; END IF;
  IF p.status <> 'active' THEN RAISE EXCEPTION 'plan not active'; END IF;
  _date := COALESCE(_date, v_today);
  v_end := p.start_date + (p.cycle_length - 1);
  IF _date < p.start_date OR _date > v_end THEN RAISE EXCEPTION 'date outside cycle'; END IF;
  IF _date > v_today THEN RAISE EXCEPTION 'cannot pay for future days'; END IF;
  SELECT * INTO pr FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF pr.balance < p.daily_amount THEN RAISE EXCEPTION 'insufficient wallet balance'; END IF;
  IF _date = v_today THEN v_status := 'paid'; ELSE v_status := 'caught_up'; END IF;
  IF v_status = 'caught_up' AND (v_today - _date) > 3 THEN
    RAISE EXCEPTION 'catch-up grace period expired';
  END IF;
  UPDATE public.profiles SET balance = balance - p.daily_amount WHERE id = auth.uid();
  INSERT INTO public.thrift_contributions (plan_id, user_id, contrib_date, amount, status, paid_at)
  VALUES (_plan_id, auth.uid(), _date, p.daily_amount, v_status, now())
  ON CONFLICT (plan_id, contrib_date) DO UPDATE
    SET amount = EXCLUDED.amount, status = EXCLUDED.status, paid_at = now()
    WHERE public.thrift_contributions.status IN ('missed', 'pending');
END; $$;

-- Complete thrift plan and payout
CREATE OR REPLACE FUNCTION public.complete_thrift_plan(_plan_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; v_total NUMERIC; v_fee NUMERIC; v_payout NUMERIC; v_today DATE := (now() AT TIME ZONE 'UTC')::date; v_end DATE;
BEGIN
  SELECT * INTO p FROM public.thrift_plans WHERE id = _plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan not found'; END IF;
  IF p.user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  IF p.status <> 'active' THEN RAISE EXCEPTION 'plan not active'; END IF;
  v_end := p.start_date + (p.cycle_length - 1);
  IF v_today < v_end AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'cycle not finished';
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_total FROM public.thrift_contributions
    WHERE plan_id = _plan_id AND status IN ('paid', 'caught_up');
  v_fee := ROUND(v_total * p.fee_percent / 100, 2);
  v_payout := v_total - v_fee;
  UPDATE public.thrift_plans SET status = 'completed' WHERE id = _plan_id;
  IF v_payout > 0 THEN
    UPDATE public.profiles SET balance = balance + v_payout WHERE id = p.user_id;
  END IF;
  INSERT INTO public.thrift_payouts (plan_id, user_id, total_saved, fee_deducted, payout_amount)
  VALUES (_plan_id, p.user_id, v_total, v_fee, v_payout);
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (p.user_id, 'thrift_payout', 'Thrift payout',
    '₦' || v_payout::TEXT || ' credited to your wallet (fee ₦' || v_fee::TEXT || ').');
END; $$;

-- Mark missed thrift days
CREATE OR REPLACE FUNCTION public.thrift_mark_missed(_plan_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; d DATE; v_today DATE := (now() AT TIME ZONE 'UTC')::date; v_end DATE;
BEGIN
  SELECT * INTO p FROM public.thrift_plans WHERE id = _plan_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_end := LEAST(p.start_date + (p.cycle_length - 1), v_today - 4);
  d := p.start_date;
  WHILE d <= v_end LOOP
    INSERT INTO public.thrift_contributions (plan_id, user_id, contrib_date, amount, status)
    VALUES (_plan_id, p.user_id, d, 0, 'missed')
    ON CONFLICT (plan_id, contrib_date) DO NOTHING;
    d := d + 1;
  END LOOP;
END; $$;

-- ============ complete_matured_investments (auto-profit crediting) ============
CREATE OR REPLACE FUNCTION public.complete_matured_investments()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
  v_profit NUMERIC;
  v_plan_name TEXT;
BEGIN
  FOR r IN
    SELECT i.id, i.user_id, i.amount, i.expected_return, p.name AS plan_name
    FROM public.investments i
    JOIN public.plans p ON p.id = i.plan_id
    WHERE i.status = 'active' AND i.end_at <= now()
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    v_profit := r.expected_return - r.amount;
    v_plan_name := r.plan_name;

    UPDATE public.investments SET status = 'completed' WHERE id = r.id;

    UPDATE public.profiles
      SET balance = balance + r.expected_return,
          returns = returns + v_profit
      WHERE id = r.user_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (r.user_id, 'investment_matured', 'Investment matured!',
      'Your investment in ' || v_plan_name || ' has matured! ₦' || r.expected_return::TEXT || ' has been credited to your wallet.');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- GRANT EXECUTE on all RPCs to authenticated
-- ============================================================
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_deposit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_deposit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_qualified_referrals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal(NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_investment(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_deposit_by_ref(TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_thrift_plan(NUMERIC, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.thrift_contribute(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_thrift_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.thrift_mark_missed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_matured_investments() TO authenticated;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default investment plans
INSERT INTO public.plans (name, icon, category, roi, duration_days, min_amount, description) VALUES
('Fixed Thrift 30', '🏦', 'thrift', 12, 30, 5000, 'Lock funds for 30 days and earn 12% return.'),
('Fixed Thrift 90', '💎', 'thrift', 40, 90, 20000, 'Premium 90-day thrift with 40% returns.'),
('AgroHarvest', '🌽', 'agriculture', 25, 60, 10000, 'Back maize and cassava harvests across Nigeria.'),
('PropertyFlip', '🏘️', 'property', 35, 120, 50000, 'Lagos short-let property profit share.'),
('FinanceBoost', '📈', 'finance', 18, 45, 8000, 'Micro-lending pool with steady weekly returns.');

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
