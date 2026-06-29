import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn, relTime } from "@/lib/format";
import { ArrowDownCircle, ArrowUpCircle, Gift, Eye, EyeOff } from "lucide-react";

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
  const { profile, user } = useAuth();
  const [tx, setTx] = useState<Array<{ id: string; kind: string; amount: number; status: string; at: string }>>([]);
  const [hidden, setHidden] = useState(false);

  const { reload } = useAuth();
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [d, w] = await Promise.all([
        supabase.from("deposits").select("id, amount, status, created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("withdrawals").select("id, amount, status, created_at").order("created_at", { ascending: false }).limit(4),
      ]);
      const items = [
        ...(d.data ?? []).map((x) => ({ id: "d" + x.id, kind: "Deposit", amount: Number(x.amount), status: x.status, at: x.created_at })),
        ...(w.data ?? []).map((x) => ({ id: "w" + x.id, kind: "Withdrawal", amount: Number(x.amount), status: x.status, at: x.created_at })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5);
      setTx(items);
      reload();
    };
    load();
    const i = setInterval(load, 2000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const balance = Number(profile?.balance ?? 0);
  const invested = Number(profile?.invested ?? 0);
  const returns = Number(profile?.returns ?? 0);

  return (
    <div className="px-4 pt-6 space-y-5">
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