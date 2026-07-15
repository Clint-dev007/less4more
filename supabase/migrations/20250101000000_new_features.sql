-- ============================================================
-- Less4More Platform Enhancement Migration
-- ============================================================

-- 1. ADD COLUMNS TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online_at timestamptz;

-- 2. NOTIFICATION SETTINGS
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  promotional boolean DEFAULT true,
  group_chat boolean DEFAULT true,
  investment boolean DEFAULT true,
  withdrawal boolean DEFAULT true,
  referral boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- 4. GROUP CHAT MESSAGES
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  reply_to uuid REFERENCES group_chat_messages(id),
  is_pinned boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. GROUP CHAT REACTIONS
CREATE TABLE IF NOT EXISTS group_chat_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES group_chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- 6. ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

-- 7. ANNOUNCEMENTS (admin broadcast)
CREATE TABLE IF NOT EXISTS announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'announcement',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 8. REFERRAL LEVELS FUNCTION
CREATE OR REPLACE FUNCTION get_referral_level(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN count(*) >= 100 THEN 'elite'
    WHEN count(*) >= 50 THEN 'diamond'
    WHEN count(*) >= 25 THEN 'gold'
    WHEN count(*) >= 10 THEN 'silver'
    ELSE 'bronze'
  END
  FROM referrals
  WHERE referrer_id = _user_id
    AND bonus_paid > 0;
$$;

-- 9. REFERRAL COUNT FUNCTION
CREATE OR REPLACE FUNCTION get_referral_count(_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE
AS $$
  SELECT count(*)::int FROM referrals WHERE referrer_id = _user_id AND bonus_paid > 0;
$$;

-- 10. VIP LEVEL FUNCTION
CREATE OR REPLACE FUNCTION get_vip_level(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN COALESCE(SUM(amount), 0) >= 5000000 THEN 'vip_elite'
    WHEN COALESCE(SUM(amount), 0) >= 2000000 THEN 'vip4'
    WHEN COALESCE(SUM(amount), 0) >= 1000000 THEN 'vip3'
    WHEN COALESCE(SUM(amount), 0) >= 500000 THEN 'vip2'
    WHEN COALESCE(SUM(amount), 0) >= 100000 THEN 'vip1'
    ELSE 'none'
  END
  FROM investments
  WHERE user_id = _user_id;
$$;

-- 11. VIP TOTAL INVESTED FUNCTION
CREATE OR REPLACE FUNCTION get_total_invested(_user_id uuid)
RETURNS numeric
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = _user_id;
$$;

-- 12. ENHANCED LEADERBOARD WITH RANKS
CREATE OR REPLACE FUNCTION get_enhanced_leaderboard(_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  name text,
  ref_code text,
  invested numeric,
  avatar_url text,
  referral_count bigint,
  referral_level text,
  vip_level text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.ref_code,
    p.invested,
    p.avatar_url,
    COALESCE(rc.cnt, 0) AS referral_count,
    CASE
      WHEN COALESCE(rc.cnt, 0) >= 100 THEN 'elite'
      WHEN COALESCE(rc.cnt, 0) >= 50 THEN 'diamond'
      WHEN COALESCE(rc.cnt, 0) >= 25 THEN 'gold'
      WHEN COALESCE(rc.cnt, 0) >= 10 THEN 'silver'
      ELSE 'bronze'
    END AS referral_level,
    CASE
      WHEN COALESCE(inv.total, 0) >= 5000000 THEN 'vip_elite'
      WHEN COALESCE(inv.total, 0) >= 2000000 THEN 'vip4'
      WHEN COALESCE(inv.total, 0) >= 1000000 THEN 'vip3'
      WHEN COALESCE(inv.total, 0) >= 500000 THEN 'vip2'
      WHEN COALESCE(inv.total, 0) >= 100000 THEN 'vip1'
      ELSE 'none'
    END AS vip_level
  FROM profiles p
  LEFT JOIN (
    SELECT referrer_id, count(*) AS cnt
    FROM referrals WHERE bonus_paid > 0
    GROUP BY referrer_id
  ) rc ON rc.referrer_id = p.id
  LEFT JOIN (
    SELECT user_id, SUM(amount) AS total
    FROM investments
    GROUP BY user_id
  ) inv ON inv.user_id = p.id
  ORDER BY p.invested DESC
  LIMIT _limit;
$$;

-- 13. SEND NOTIFICATION FUNCTION
CREATE OR REPLACE FUNCTION send_notification(
  _user_id uuid,
  _title text,
  _body text,
  _type text DEFAULT 'general'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO notifications (user_id, title, body, type)
  VALUES (_user_id, _title, _body, _type)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- 14. BROADCAST NOTIFICATION TO ALL USERS
CREATE OR REPLACE FUNCTION broadcast_notification(
  _title text,
  _body text,
  _type text DEFAULT 'announcement'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, body, type)
  SELECT id, _title, _body, _type FROM profiles;
END;
$$;

-- 15. AWARD ACHIEVEMENT FUNCTION
CREATE OR REPLACE FUNCTION award_achievement(
  _user_id uuid,
  _key text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_key)
  VALUES (_user_id, _key)
  ON CONFLICT (user_id, achievement_key) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- 16. GET USER ACHIEVEMENTS
CREATE OR REPLACE FUNCTION get_user_achievements(_user_id uuid)
RETURNS TABLE (achievement_key text, awarded_at timestamptz)
LANGUAGE sql STABLE
AS $$
  SELECT ua.achievement_key, ua.awarded_at
  FROM user_achievements ua
  WHERE ua.user_id = _user_id
  ORDER BY ua.awarded_at DESC;
$$;

-- 17. CHECK AND AWARD ALL ACHIEVEMENTS FOR A USER
CREATE OR REPLACE FUNCTION check_award_achievements(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  _ref_count int;
  _total_invested numeric;
  _has_investment boolean;
  _days_active int;
BEGIN
  SELECT count(*)::int INTO _ref_count FROM referrals WHERE referrer_id = _user_id AND bonus_paid > 0;
  SELECT COALESCE(SUM(amount), 0) INTO _total_invested FROM investments WHERE user_id = _user_id;
  SELECT EXISTS(SELECT 1 FROM investments WHERE user_id = _user_id) INTO _has_investment;
  SELECT (now()::date - (SELECT joined_at::date FROM profiles WHERE id = _user_id)) INTO _days_active;

  IF _has_investment THEN
    PERFORM award_achievement(_user_id, 'first_investment');
  END IF;

  IF _ref_count >= 1 THEN PERFORM award_achievement(_user_id, 'first_referral'); END IF;
  IF _total_invested >= 100000 THEN PERFORM award_achievement(_user_id, 'invested_100k'); END IF;
  IF _days_active >= 30 THEN PERFORM award_achievement(_user_id, 'active_30_days'); END IF;
  IF _ref_count >= 1 THEN PERFORM award_achievement(_user_id, 'bronze_referrer'); END IF;
  IF _ref_count >= 10 THEN PERFORM award_achievement(_user_id, 'silver_referrer'); END IF;
  IF _ref_count >= 25 THEN PERFORM award_achievement(_user_id, 'gold_referrer'); END IF;
  IF _ref_count >= 50 THEN PERFORM award_achievement(_user_id, 'diamond_referrer'); END IF;
  IF _ref_count >= 100 THEN PERFORM award_achievement(_user_id, 'elite_ambassador'); END IF;
  IF _total_invested >= 100000 THEN PERFORM award_achievement(_user_id, 'vip1'); END IF;
  IF _total_invested >= 500000 THEN PERFORM award_achievement(_user_id, 'vip2'); END IF;
  IF _total_invested >= 1000000 THEN PERFORM award_achievement(_user_id, 'vip3'); END IF;
  IF _total_invested >= 2000000 THEN PERFORM award_achievement(_user_id, 'vip4'); END IF;
  IF _total_invested >= 5000000 THEN PERFORM award_achievement(_user_id, 'vip_elite_achievement'); END IF;
END;
$$;

-- 18. ONLINE STATUS TRACKING
CREATE OR REPLACE FUNCTION update_online_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles SET online_at = now() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- 19. GET ONLINE USERS
CREATE OR REPLACE FUNCTION get_online_users(_seconds int DEFAULT 300)
RETURNS TABLE (user_id uuid)
LANGUAGE sql STABLE
AS $$
  SELECT id FROM profiles
  WHERE online_at > (now() - (_seconds || ' seconds')::interval);
$$;

-- 20. RLS POLICIES
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- notification_settings
CREATE POLICY "Users can view own settings" ON notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON notification_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- group_chat_messages
CREATE POLICY "Anyone can read messages" ON group_chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON group_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON group_chat_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any message" ON group_chat_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
);

-- group_chat_reactions
CREATE POLICY "Anyone can read reactions" ON group_chat_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON group_chat_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON group_chat_reactions FOR DELETE USING (auth.uid() = user_id);

-- user_achievements
CREATE POLICY "Anyone can view achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "System can award achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- announcements
CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Admins can create announcements" ON announcements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 21. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE group_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
