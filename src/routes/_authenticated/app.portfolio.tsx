import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/portfolio")({
  component: PortfolioPage,
});

type Inv = {
  id: string; amount: number; expected_return: number;
  start_at: string; end_at: string; status: string;
  plans: { name: string; icon: string; roi: number } | null;
};
type W = { id: string; amount: number; status: string; created_at: string; payout_day: string };

function PortfolioPage() {
  const { user, reload } = useAuth();
  const [investments, setI] = useState<Inv[]>([]);
  const [wd, setW] = useState<W[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await supabase.rpc("complete_matured_investments");
      const [invRes, wdRes] = await Promise.all([
        supabase.from("investments")
          .select("id, amount, expected_return, start_at, end_at, status, plans(name, icon, roi)")
          .eq("user_id", user.id)
          .order("start_at", { ascending: false }),
        supabase.from("withdrawals")
          .select("id, amount, status, created_at, payout_day")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setI((invRes.data ?? []) as unknown as Inv[]);
      setW((wdRes.data ?? []) as W[]);
      reload();
    };
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const active = investments.filter((i) => i.status === "active");
  const completed = investments.filter((i) => i.status === "completed");

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold">Portfolio</h1>

      <div>
        <div className="text-sm font-semibold mb-2">Active investments</div>
        <div className="space-y-3">
          {active.length === 0 && <Empty text="No active investments — pick a plan from Invest." />}
          {active.map((i) => {
            const start = new Date(i.start_at).getTime();
            const end = new Date(i.end_at).getTime();
            const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
            return (
              <div key={i.id} className="card-3d rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl gradient-primary grid place-items-center text-xl glow-primary">{i.plans?.icon ?? "💼"}</div>
                    <div>
                      <div className="font-semibold">{i.plans?.name ?? "Plan"}</div>
                      <div className="text-[11px] text-muted-foreground">Matures {shortDate(i.end_at)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{ngn(i.amount)}</div>
                    <div className="text-[11px] text-gold font-semibold">→ {ngn(i.expected_return)}</div>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: pct + "%" }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>{Math.round(pct)}% complete</span>
                  <span className="capitalize">{i.status}</span>
                </div>
                <Countdown endAt={i.end_at} />
              </div>
            );
          })}
        </div>
      </div>

      {completed.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2">Completed investments</div>
          <div className="space-y-3">
            {completed.map((i) => (
              <div key={i.id} className="card-3d rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl gradient-gold grid place-items-center text-xl glow-gold">{i.plans?.icon ?? "💼"}</div>
                    <div>
                      <div className="font-semibold">{i.plans?.name ?? "Plan"}</div>
                      <div className="text-[11px] text-muted-foreground">Completed {shortDate(i.end_at)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{ngn(i.amount)}</div>
                    <div className="text-[11px] text-success font-semibold">✓ {ngn(i.expected_return)}</div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-success/15 border border-success/30 px-3 py-2 text-center text-[11px] font-bold text-success uppercase tracking-wider">
                  Completed — {ngn(i.expected_return - i.amount)} profit earned
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-sm font-semibold mb-2">Withdrawal status</div>
        <div className="space-y-2">
          {wd.length === 0 && <Empty text="No withdrawals yet." />}
          {wd.map((w) => (
            <div key={w.id} className="card-3d rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{ngn(w.amount)}</div>
                <div className="text-[11px] text-muted-foreground">Payout: {w.payout_day} · {shortDate(w.created_at)}</div>
              </div>
              <StatusPill s={w.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-gold/15 text-foreground border-gold/30",
    approved: "bg-success/15 text-foreground border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${map[s] ?? "bg-secondary"}`}>{s}</span>;
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground text-center py-6 card-3d rounded-2xl">{text}</div>;
}

function Countdown({ endAt }: { endAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(endAt).getTime() - now;
  if (diff <= 0) {
    return (
      <div className="mt-3 rounded-xl bg-success/15 border border-success/30 px-3 py-2 text-center text-[11px] font-bold text-success uppercase tracking-wider">
        Matured
      </div>
    );
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const Cell = ({ v, l }: { v: number; l: string }) => (
    <div className="flex-1 rounded-lg bg-background/60 border border-border py-1.5">
      <div className="text-base font-bold leading-none tabular-nums text-primary">{String(v).padStart(2, "0")}</div>
      <div className="text-[9px] text-muted-foreground uppercase mt-0.5">{l}</div>
    </div>
  );
  return (
    <div className="mt-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Time to maturity</div>
      <div className="flex gap-1.5 text-center">
        <Cell v={d} l="Days" />
        <Cell v={h} l="Hrs" />
        <Cell v={m} l="Min" />
        <Cell v={s} l="Sec" />
      </div>
    </div>
  );
}
