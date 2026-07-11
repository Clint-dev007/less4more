import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn, relTime } from "@/lib/format";
import { ArrowDownCircle, ArrowUpCircle, Gift, Eye, EyeOff, TrendingUp, PiggyBank } from "lucide-react";
import { InstallBanner, InstallAppCard } from "@/components/install-app";

export const Route = createFileRoute("/_authenticated/app/")({
  component: HomePage,
});

function Donut({ invested, returns, balance }: { invested: number; returns: number; balance: number }) {
  const total = Math.max(invested + returns + balance, 1);
  const a = (invested / total) * 360;
  const b = (returns / total) * 360;
  return (
    <div className="relative h-44 w-44 mx-auto">
      <div className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(var(--primary) 0deg ${a}deg, var(--gold) ${a}deg ${a+b}deg, color-mix(in oklab, var(--primary) 18%, transparent) ${a+b}deg 360deg)` }} />
      <div className="absolute inset-3 rounded-full bg-card card-3d grid place-items-center">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Portfolio</div>
          <div className="text-2xl font-bold">{ngn(invested + returns)}</div>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const { profile, user, reload } = useAuth();
  const [tx, setTx] = useState<Array<{ id: string; kind: string; amount: number; status: string; at: string }>>([]);
  const [hidden, setHidden] = useState(false);
  const [estimated, setEstimated] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [thrift, setThrift] = useState<{ active: number; saved: number; nextPayout: string | null }>({ active: 0, saved: 0, nextPayout: null });
  useEffect(() => {
    if (!user) return;
    supabase.rpc("complete_matured_investments");
    const load = async () => {
      const [d, w, inv, tp, tc] = await Promise.all([
        supabase.from("deposits").select("id, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("withdrawals").select("id, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("investments").select("amount, expected_return, status").eq("user_id", user.id).eq("status", "active"),
        supabase.from("thrift_plans").select("id, daily_amount, cycle_length, start_date, status").eq("user_id", user.id).eq("status", "active"),
        supabase.from("thrift_contributions").select("amount, status").eq("user_id", user.id).in("status", ["paid", "caught_up"]),
      ]);
      const items = [
        ...(d.data ?? []).map((x) => ({ id: "d" + x.id, kind: "Deposit", amount: Number(x.amount), status: x.status, at: x.created_at })),
        ...(w.data ?? []).map((x) => ({ id: "w" + x.id, kind: "Withdrawal", amount: Number(x.amount), status: x.status, at: x.created_at })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5);
      setTx(items);
      const rows = (inv.data ?? []) as Array<{ amount: number; expected_return: number }>;
      setEstimated(rows.reduce((s, r) => s + Number(r.expected_return) - Number(r.amount), 0));
      setActiveCount(rows.length);
      const plans = (tp.data ?? []) as Array<{ start_date: string; cycle_length: number }>;
      const saved = ((tc.data ?? []) as Array<{ amount: number }>).reduce((s, r) => s + Number(r.amount), 0);
      let next: string | null = null;
      plans.forEach((p) => {
        const end = new Date(p.start_date + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() + p.cycle_length - 1);
        const iso = end.toISOString().slice(0, 10);
        if (!next || iso < next) next = iso;
      });
      setThrift({ active: plans.length, saved, nextPayout: next });
      reload();
    };
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const balance = Number(profile?.balance ?? 0);
  const invested = Number(profile?.invested ?? 0);
  const returns = Number(profile?.returns ?? 0);

  return (
    <div className="px-4 pt-6 space-y-5">
      <InstallBanner />
      <div>
        <div className="text-sm text-muted-foreground">Hi 👋</div>
        <div className="text-xl font-bold">{profile?.name || "Welcome"}</div>
      </div>

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
          <Link to="/app/deposit" className="bg-white/20 hover:bg-white/25 backdrop-blur rounded-2xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5">
            <ArrowDownCircle className="h-4 w-4" /> Deposit
          </Link>
          <Link to="/app/withdraw" className="bg-white/20 hover:bg-white/25 backdrop-blur rounded-2xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5">
            <ArrowUpCircle className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="card-3d rounded-3xl p-4 flex items-center gap-3 relative overflow-hidden">
        <div className="h-12 w-12 rounded-2xl gradient-gold grid place-items-center glow-gold shrink-0">
          <TrendingUp className="h-5 w-5 text-gold-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimated return</div>
          <div className="text-2xl font-bold text-gold leading-tight">
            {hidden ? "₦ ••••••" : `+${ngn(estimated)}`}
          </div>
          <div className="text-[11px] text-muted-foreground">
            From {activeCount} active {activeCount === 1 ? "investment" : "investments"} at maturity
          </div>
        </div>
      </motion.div>

      <Link to="/app/thrift" className="block card-3d rounded-3xl p-4 relative overflow-hidden">
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

      <div className="card-3d rounded-3xl p-5">
        <div className="text-sm font-semibold mb-2">Portfolio</div>
        <Donut invested={invested} returns={returns} balance={balance} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Invested" v={invested} dot="var(--primary)" />
          <Stat label="Returns" v={returns} dot="var(--gold)" />
          <Stat label="Wallet" v={balance} dot="color-mix(in oklab, var(--primary) 18%, transparent)" />
        </div>
      </div>

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
          <div className="text-2xl font-bold mt-1">Explore 5 active plans →</div>
          <div className="text-xs opacity-80 mt-1">From ₦5,000 · up to 40% ROI</div>
        </div>
      </Link>

      <InstallAppCard />

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

function Stat({ label, v, dot }: { label: string; v: number; dot: string }) {
  return (
    <div className="rounded-xl bg-secondary py-2">
      <div className="flex items-center justify-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-bold mt-0.5">{ngn(v)}</div>
    </div>
  );
}