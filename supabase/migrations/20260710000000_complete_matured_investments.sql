
-- ============ RPC: complete matured investments ============
-- Finds all active investments past their end_at date,
-- credits expected_return to the user's wallet, updates returns,
-- and sends a notification.
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

    -- Mark investment as completed
    UPDATE public.investments SET status = 'completed' WHERE id = r.id;

    -- Credit expected_return to wallet and track total returns
    UPDATE public.profiles
      SET balance = balance + r.expected_return,
          returns = returns + v_profit
      WHERE id = r.user_id;

    -- Notify the user
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (r.user_id, 'investment_matured', 'Investment matured!',
      'Your investment in ' || v_plan_name || ' has matured! ₦' || r.expected_return::TEXT || ' has been credited to your wallet.');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_matured_investments() TO authenticated;
