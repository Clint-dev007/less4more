
-- Fee settings per cycle length
CREATE TABLE public.thrift_fee_settings (
  cycle_length INT PRIMARY KEY,
  fee_percent NUMERIC NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.thrift_fee_settings TO authenticated;
GRANT ALL ON public.thrift_fee_settings TO service_role;
ALTER TABLE public.thrift_fee_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read fees" ON public.thrift_fee_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write fees" ON public.thrift_fee_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.thrift_fee_settings (cycle_length, fee_percent) VALUES (30, 5), (60, 4), (90, 3);

CREATE TYPE public.thrift_plan_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.thrift_contrib_status AS ENUM ('paid', 'missed', 'caught_up', 'pending');

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
CREATE POLICY "own plans" ON public.thrift_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own plans" ON public.thrift_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own plans" ON public.thrift_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

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
CREATE POLICY "own contribs" ON public.thrift_contributions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

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
CREATE POLICY "own payouts" ON public.thrift_payouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Create plan
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

-- Contribute (today or specific date - for catch-up)
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
  -- caught_up if not today
  IF _date = v_today THEN v_status := 'paid'; ELSE v_status := 'caught_up'; END IF;
  -- 3-day grace for catch-up
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

-- Complete plan and payout
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

-- Mark past days as missed if not paid (grace expired)
CREATE OR REPLACE FUNCTION public.thrift_mark_missed(_plan_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; d DATE; v_today DATE := (now() AT TIME ZONE 'UTC')::date; v_end DATE;
BEGIN
  SELECT * INTO p FROM public.thrift_plans WHERE id = _plan_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_end := LEAST(p.start_date + (p.cycle_length - 1), v_today - 4); -- past grace
  d := p.start_date;
  WHILE d <= v_end LOOP
    INSERT INTO public.thrift_contributions (plan_id, user_id, contrib_date, amount, status)
    VALUES (_plan_id, p.user_id, d, 0, 'missed')
    ON CONFLICT (plan_id, contrib_date) DO NOTHING;
    d := d + 1;
  END LOOP;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_thrift_plan(NUMERIC, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.thrift_contribute(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_thrift_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.thrift_mark_missed(UUID) TO authenticated;
