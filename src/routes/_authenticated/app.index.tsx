import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn, relTime } from "@/lib/format";
import { getReferralLevel, getVipLevel, getNextReferralThreshold, getNextVipThreshold, REFERRAL_LEVELS, VIP_LEVELS, type ReferralLevel, type VipLevel } from "@/lib/ranks";
import { ReferralBadge, VipBadge } from "@/components/badges";
import { AchievementGrid, useAchievements } from "@/components/achievements";
import { ArrowDownCircle, ArrowUpCircle, Gift, Eye, EyeOff, TrendingUp, PiggyBank, Users, Crown, Trophy, Bell, MessageSquare, Briefcase } from "lucide-react";
import { InstallBanner, InstallAppCard } from "@/components/install-app";

export const Route = createFileRoute("/_authenticated/app/")({ component: HomePage });

function StatCard({ icon: Icon, label, value, gradient, sub }: {
  icon: typeof TrendingUp; label: string; value: string; gradient: string; sub?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10 blur-xl" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-80" />
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function ProgressBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span>{current.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" />
      </div>
    </div>
  );
}

function HomePage() {
  const { profile, user } = useAuth();
  const earned = useAchievements();
  const [tx, setTx] = useState<Array<{ id: string; kind: string; amount: number; status: string; at: string }>>([]);
  const [hidden, setHidden] = useState(false);
  const [estimated, setEstimated] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [thrift, setThrift] = useState({ active: 0, saved: 0, nextPayout: null as string | null });
  const [refCount, setRefCount] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0);
  const [myLevel, setMyLevel] = useState<ReferralLevel>("bronze");
  const [myVip, setMyVip] = useState<VipLevel>("none");

  useEffect(() => {
    if (!user) return;
    supabase.rpc("complete_matured_investments");
    const load = async () => {
      const [d, w, inv, tp, tc, refs] = await Promise.all([
        supabase.from("deposits").select("id, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("withdrawals").select("id, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("investments").select("amount, expected_return, status").eq("user_id", user.id),
        supabase.from("thrift_plans").select("id, daily_amount, cycle_length, start_date, status").eq("user_id", user.id).eq("status", "active"),
        supabase.from("thrift_contributions").select("amount, status").eq("user_id", user.id).in("status", ["paid", "caught_up"]),
        supabase.from("referrals").select("id, bonus_paid").eq("referrer_id", user.id),
      ]);

      const items = [
        ...(d.data ?? []).map((x) => ({ id: "d" + x.id, kind: "Deposit", amount: Number(x.amount), status: x.status, at: x.created_at })),
        ...(w.data ?? []).map((x) => ({ id: "w" + x.id, kind: "Withdrawal", amount: Number(x.amount), status: x.status, at: x.created_at })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5);
      setTx(items);

      const activeInv = (inv.data ?? []).filter((r) => r.status === "active");
      const completedInv = (inv.data ?? []).filter((r) => r.status === "completed");
      setEstimated(activeInv.reduce((s, r) => s + Number(r.expected_return) - Number(r.amount), 0));
      setActiveCount(activeInv.length);
      setCompletedCount(completedInv.length);

      const plans = (tp.data ?? []);
      const saved = ((tc.data ?? []) as Array<{ amount: number }>).reduce((s, r) => s + Number(r.amount), 0);
      let next: string | null = null;
      plans.forEach((p) => {
        const end = new Date(p.start_date + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + p.cycle_length - 1);
        const iso = end.toISOString().slice(0, 10);
        if (!next || iso < next) next = iso;
      });
      setThrift({ active: plans.length, saved, nextPayout: next });

      const qualifiedRefs = (refs.data ?? []).filter((r) => r.bonus_paid > 0).length;
      setRefCount(qualifiedRefs);

      const totalInv = Number(profile?.invested ?? 0);
      setMyLevel(getReferralLevel(qualifiedRefs));
      setMyVip(getVipLevel(totalInv));

      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false)
        .then(({ count }) => setUnreadNotif(count ?? 0));
    };
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const balance = Number(profile?.balance ?? 0);
  const invested = Number(profile?.invested ?? 0);
  const returns = Number(profile?.returns ?? 0);

  const nextRef = getNextReferralThreshold(myLevel);
  const nextVip = getNextVipThreshold(myVip);

  return (
    <div className="px-4 pt-6 space-y-5">
      <InstallBanner />

      <div>
        <div className="text-sm text-muted-foreground">Hi 👋</div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{profile?.name || "Welcome"}</span>
          <ReferralBadge level={myLevel} size="xs" />
          {myVip !== "none" && <VipBadge level={myVip} size="xs" />}
        </div>
      </div>

      {/* Wallet Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl gradient-primary glow-primary p-5 text-primary-foreground relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <div className="flex items-center justify-between">
          <div className="text-xs opacity-80">Wallet balance</div>
          <button onClick={() => setHidden((h) => !h)} className="p-1.5 rounded-full bg-white/20">
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="text-4xl font-bold tracking-tight mt-1">
          {hidden ? "₦ ••••••" : ngn(balance)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/app/deposit" preload="intent" className="bg-white/20 hover:bg-white/25 backdrop-blur rounded-2xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5">
            <ArrowDownCircle className="h-4 w-4" /> Deposit
          </Link>
          <Link to="/app/withdraw" preload="intent" className="bg-white/20 hover:bg-white/25 backdrop-blur rounded-2xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5">
            <ArrowUpCircle className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={TrendingUp} label="Expected Return" value={hidden ? "₦•••" : `+${ngn(estimated)}`} gradient="from-amber-500 to-orange-600" sub={`${activeCount} active`} />
        <StatCard icon={Briefcase} label="Completed" value={`${completedCount}`} gradient="from-green-500 to-emerald-600" sub={`${ngn(returns)} earned`} />
        <StatCard icon={Users} label="Referrals" value={`${refCount}`} gradient="from-blue-500 to-indigo-600" sub={`${myLevel} level`} />
        <StatCard icon={Trophy} label="Referral Rank" value={REFERRAL_LEVELS[myLevel].icon + " " + REFERRAL_LEVELS[myLevel].label} gradient="from-purple-500 to-pink-600" sub={myVip !== "none" ? VIP_LEVELS[myVip].label : ""} />
      </div>

      {/* Progress to next levels */}
      <div className="card-3d rounded-2xl p-4 space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress</div>
        {nextRef !== Infinity && (
          <ProgressBar current={refCount} max={nextRef} label={`Next referral level (${nextRef} referrals)`} />
        )}
        {nextVip !== Infinity && (
          <ProgressBar current={invested} max={nextVip} label={`Next VIP level (${ngn(nextVip)})`} />
        )}
        {nextRef === Infinity && nextVip === Infinity && (
          <div className="text-xs text-muted-foreground text-center py-2">🎉 You've reached the highest levels!</div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { to: "/app/chat", icon: MessageSquare, label: "Chat" },
          { to: "/app/leaderboard", icon: Trophy, label: "Leaderboard" },
          { to: "/app/notifications", icon: Bell, label: "Alerts", badge: unreadNotif },
          { to: "/app/notification-settings", icon: Users, label: "Settings" },
        ].map((item) => (
          <Link key={item.to} to={item.to as never} preload="intent"
            className="card-3d rounded-2xl p-3 flex flex-col items-center gap-1.5 relative">
            <item.icon className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
            {item.badge ? (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] grid place-items-center font-bold">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      <Link to="/app/thrift" preload="intent" className="block card-3d rounded-3xl p-4 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl gradient-gold grid place-items-center glow-gold shrink-0">
            <PiggyBank className="h-6 w-6 text-gold-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">My Thrift Plans</div>
            {thrift.active > 0 ? (
              <div className="text-[11px] text-muted-foreground">
                {thrift.active} active · saved {ngn(thrift.saved)}{thrift.nextPayout ? ` · next payout ${thrift.nextPayout}` : ""}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">Save daily, get paid on completion. Start now →</div>
            )}
          </div>
        </div>
      </Link>

      <Link to="/app/referrals" className="block card-3d rounded-3xl p-4 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl gradient-gold grid place-items-center glow-gold animate-float">
            <Gift className="h-5 w-5 text-gold-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Earn 10% on every referral</div>
            <div className="text-xs text-muted-foreground">Your code: <span className="font-mono font-bold text-primary">{profile?.ref_code}</span></div>
          </div>
        </div>
      </Link>

      <Link to="/app/invest" className="block">
        <div className="rounded-3xl gradient-sky glow-neon p-5 text-white relative overflow-hidden">
          <div className="text-xs opacity-90">Quick invest</div>
          <div className="text-2xl font-bold mt-1">Explore active plans →</div>
          <div className="text-xs opacity-80 mt-1">From ₦5,000 · up to 40% ROI</div>
        </div>
      </Link>

      <InstallAppCard />

      {/* Achievements */}
      {earned.size > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2 px-1 flex items-center gap-1.5">🏆 Achievements ({earned.size})</div>
          <AchievementGrid earned={earned} />
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="text-sm font-semibold mb-2 px-1">Recent activity</div>
        <div className="space-y-2">
          {tx.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6 card-3d rounded-2xl">No activity yet</div>
          )}
          {tx.map((t) => (
            <div key={t.id} className="card-3d rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{t.kind}</div>
                <div className="text-[11px] text-muted-foreground">{relTime(t.at)} · {t.status}</div>
              </div>
              <div className={`font-bold ${t.kind === "Deposit" ? "text-success" : "text-foreground"}`}>
                {t.kind === "Deposit" ? "+" : "-"}{ngn(t.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
