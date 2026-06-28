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
  const { user } = useAuth();
  const [investments, setI] = useState<Inv[]>([]);
  const [wd, setW] = useState<W[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("investments")
      .select("id, amount, expected_return, start_at, end_at, status, plans(name, icon, roi)")
      .order("start_at", { ascending: false })
      .then(({ data }) => setI((data ?? []) as unknown as Inv[]));
    supabase.from("withdrawals").select("id, amount, status, created_at, payout_day").order("created_at", { ascending: false })
      .then(({ data }) => setW((data ?? []) as W[]));
  }, [user]);

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold">Portfolio</h1>

      <div>
        <div className="text-sm font-semibold mb-2">Active investments</div>
        <div className="space-y-3">
          {investments.length === 0 && <Empty text="No investments yet — pick a plan from Invest." />}
          {investments.map((i) => {
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
              </div>
            );
          })}
        </div>
      </div>

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
