import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn } from "@/lib/format";
import { toast } from "sonner";
import { PiggyBank, Plus, Check, X, Clock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/thrift")({
  component: ThriftPage,
});

const DAILY_PRESETS = [200, 500, 1000, 2000];
const CYCLES = [30, 60, 90];

type Plan = {
  id: string; daily_amount: number; cycle_length: number; fee_percent: number;
  auto_debit: boolean; start_date: string; status: string;
};
type Contribution = { contrib_date: string; amount: number; status: string };
type FeeRow = { cycle_length: number; fee_percent: number };

function todayUTC() { return new Date().toISOString().slice(0, 10); }
function addDays(d: string, n: number) {
  const dt = new Date(d + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function dayDiff(a: string, b: string) {
  return Math.floor((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}

function ThriftPage() {
  const { user, profile, reload } = useAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    if (!user) return;
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from("thrift_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("thrift_fee_settings").select("cycle_length,fee_percent"),
    ]);
    setPlans((p ?? []) as Plan[]);
    setFees((f ?? []) as FeeRow[]);
  }

  useEffect(() => { load(); const i = setInterval(load, 3000); return () => clearInterval(i); // eslint-disable-next-line
  }, [user]);

  const active = plans.filter((p) => p.status === "active");
  const completed = plans.filter((p) => p.status !== "active");

  return (
    <div className="px-4 pt-6 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Wallet balance</div>
          <div className="text-xl font-bold">{ngn(profile?.balance ?? 0)}</div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold glow-primary flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> New plan
        </button>
      </div>

      <div className="card-3d rounded-3xl p-5 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl gradient-gold grid place-items-center glow-gold">
            <PiggyBank className="h-6 w-6 text-gold-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold">Olidara-style savings</div>
            <div className="text-xs text-muted-foreground">Save daily · payout to wallet at end of cycle</div>
          </div>
        </div>
      </div>

      {active.length === 0 && (
        <div className="card-3d rounded-3xl p-8 text-center">
          <div className="text-sm text-muted-foreground">No active plan. Start one to build the habit 💪</div>
        </div>
      )}

      {active.map((p) => (
        <PlanCard key={p.id} plan={p} onChange={() => { load(); reload(); }} />
      ))}

      {completed.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground px-1 mb-2">History</div>
          <div className="space-y-2">
            {completed.map((p) => (
              <div key={p.id} className="card-3d rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{ngn(p.daily_amount)}/day · {p.cycle_length}d</div>
                  <div className="text-[11px] text-muted-foreground">Started {p.start_date} · {p.status}</div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-secondary uppercase">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateModal fees={fees} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />
      )}

      <Link to="/app" className="block text-center text-xs text-muted-foreground mt-4">← Back to home</Link>
      <div className="hidden">{nav.length}</div>
    </div>
  );
}

function CreateModal({ fees, onClose, onDone }: { fees: FeeRow[]; onClose: () => void; onDone: () => void }) {
  const [daily, setDaily] = useState<number>(500);
  const [custom, setCustom] = useState("");
  const [cycle, setCycle] = useState<number>(30);
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState(false);

  const finalDaily = custom ? Number(custom.replace(/[^0-9]/g, "")) : daily;
  const fee = fees.find((f) => f.cycle_length === cycle)?.fee_percent ?? 5;
  const totalSave = finalDaily * cycle;
  const feeAmt = Math.round((totalSave * fee) / 100);
  const payout = totalSave - feeAmt;

  async function submit() {
    if (!finalDaily || finalDaily < 100) { toast.error("Minimum ₦100/day"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("create_thrift_plan", {
      _daily: finalDaily, _cycle: cycle, _auto: auto,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thrift plan created 🎉");
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-end sm:place-items-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl p-5 space-y-4 card-3d">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">New Thrift Plan</div>
          <button onClick={onClose} className="p-1 rounded-full bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">Daily amount</div>
          <div className="grid grid-cols-4 gap-2">
            {DAILY_PRESETS.map((v) => (
              <button key={v} onClick={() => { setDaily(v); setCustom(""); }}
                className={`py-2 rounded-xl text-xs font-semibold ${daily === v && !custom ? "gradient-primary text-primary-foreground" : "bg-secondary"}`}>
                ₦{v.toLocaleString()}
              </button>
            ))}
          </div>
          <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="or enter custom amount"
            className="mt-2 w-full h-10 rounded-xl bg-secondary px-3 text-sm outline-none" />
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">Cycle length</div>
          <div className="grid grid-cols-3 gap-2">
            {CYCLES.map((c) => (
              <button key={c} onClick={() => setCycle(c)}
                className={`py-2 rounded-xl text-xs font-semibold ${cycle === c ? "gradient-primary text-primary-foreground" : "bg-secondary"}`}>
                {c} days
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2.5">
          <span className="text-sm">Auto-debit daily from wallet</span>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4" />
        </label>

        <div className="rounded-2xl gradient-gold text-gold-foreground p-4 space-y-1">
          <div className="flex items-center justify-between text-xs"><span>Total to save</span><b>{ngn(totalSave)}</b></div>
          <div className="flex items-center justify-between text-xs"><span>Fee ({fee}%)</span><b>-{ngn(feeAmt)}</b></div>
          <div className="flex items-center justify-between text-sm pt-1 border-t border-white/30"><span>Projected payout</span><b>{ngn(payout)}</b></div>
        </div>

        <button disabled={busy} onClick={submit}
          className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold glow-primary disabled:opacity-60">
          {busy ? "Creating…" : "Confirm & start"}
        </button>
      </div>
    </div>
  );
}

function PlanCard({ plan, onChange }: { plan: Plan; onChange: () => void }) {
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("thrift_contributions")
      .select("contrib_date, amount, status")
      .eq("plan_id", plan.id).order("contrib_date", { ascending: true });
    setContribs((data ?? []) as Contribution[]);
  }
  useEffect(() => { load(); const i = setInterval(load, 3000); return () => clearInterval(i); // eslint-disable-next-line
  }, [plan.id]);

  const today = todayUTC();
  const endDate = addDays(plan.start_date, plan.cycle_length - 1);
  const daysDone = contribs.filter((c) => c.status === "paid" || c.status === "caught_up").length;
  const totalSaved = contribs.filter((c) => c.status === "paid" || c.status === "caught_up").reduce((s, c) => s + Number(c.amount), 0);
  const daysRem = Math.max(0, dayDiff(today, endDate));
  const feeAmt = Math.round((plan.daily_amount * plan.cycle_length * plan.fee_percent) / 100);
  const projectedPayout = plan.daily_amount * plan.cycle_length - feeAmt;

  const paidToday = contribs.some((c) => c.contrib_date === today && (c.status === "paid" || c.status === "caught_up"));
  const cycleEnded = today >= endDate;

  async function pay(date: string) {
    setBusy(true);
    const { error } = await supabase.rpc("thrift_contribute", { _plan_id: plan.id, _date: date });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contribution recorded ✅");
    onChange();
    load();
  }

  async function complete() {
    setBusy(true);
    const { error } = await supabase.rpc("complete_thrift_plan", { _plan_id: plan.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payout credited to your wallet 🎉");
    onChange();
  }

  // build day cells
  const cells = useMemo(() => {
    const arr: Array<{ date: string; status: string }> = [];
    for (let i = 0; i < plan.cycle_length; i++) {
      const d = addDays(plan.start_date, i);
      const c = contribs.find((x) => x.contrib_date === d);
      let status = "future";
      if (c) status = c.status;
      else if (d < today) {
        const graceExpired = dayDiff(d, today) > 3;
        status = graceExpired ? "missed" : "catchup";
      } else if (d === today) status = "today";
      arr.push({ date: d, status });
    }
    return arr;
  }, [contribs, plan.cycle_length, plan.start_date, today]);

  return (
    <div className="card-3d rounded-3xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-bold">{ngn(plan.daily_amount)}/day · {plan.cycle_length} days</div>
          <div className="text-[11px] text-muted-foreground">
            Started {plan.start_date} · ends {endDate} · fee {plan.fee_percent}%
          </div>
        </div>
        {plan.auto_debit && <span className="text-[10px] px-2 py-1 rounded-full bg-primary/20 text-primary uppercase">Auto</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Days done" v={`${daysDone}/${plan.cycle_length}`} />
        <Stat label="Saved" v={ngn(totalSaved)} />
        <Stat label="Days left" v={String(daysRem)} />
      </div>

      <div className="rounded-2xl bg-secondary p-3">
        <div className="text-[11px] text-muted-foreground mb-2">Contribution calendar</div>
        <div className="grid grid-cols-10 gap-1">
          {cells.map((c) => {
            const cls =
              c.status === "paid" ? "bg-success text-white" :
              c.status === "caught_up" ? "bg-gold text-gold-foreground" :
              c.status === "missed" ? "bg-destructive/70 text-white" :
              c.status === "today" ? "gradient-primary text-primary-foreground animate-pulse" :
              c.status === "catchup" ? "bg-amber-500 text-white" :
              "bg-muted text-muted-foreground";
            return <div key={c.date} title={`${c.date} · ${c.status}`}
              className={`aspect-square rounded-md text-[9px] grid place-items-center font-bold ${cls}`}>
              {new Date(c.date + "T00:00:00Z").getUTCDate()}
            </div>;
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-[9px]">
          <Legend c="bg-success" t="paid" />
          <Legend c="bg-gold" t="caught-up" />
          <Legend c="bg-amber-500" t="grace" />
          <Legend c="bg-destructive/70" t="missed" />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        <span>Projected payout at completion: <b>{ngn(projectedPayout)}</b></span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy || paidToday} onClick={() => pay(today)}
          className="py-2.5 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold glow-primary disabled:opacity-50 flex items-center justify-center gap-1.5">
          {paidToday ? <><Check className="h-4 w-4" /> Paid today</> : <><Clock className="h-4 w-4" /> Contribute today</>}
        </button>
        {cycleEnded ? (
          <button disabled={busy} onClick={complete}
            className="py-2.5 rounded-2xl gradient-gold text-gold-foreground text-sm font-semibold glow-gold disabled:opacity-50">
            Claim payout
          </button>
        ) : (
          <CatchUpButton cells={cells} onPay={pay} busy={busy} />
        )}
      </div>
    </div>
  );
}

function CatchUpButton({ cells, onPay, busy }: { cells: Array<{ date: string; status: string }>; onPay: (d: string) => void; busy: boolean }) {
  const gracing = cells.filter((c) => c.status === "catchup");
  if (gracing.length === 0) {
    return <div className="py-2.5 rounded-2xl bg-secondary text-xs text-muted-foreground text-center">No missed days</div>;
  }
  return (
    <button disabled={busy} onClick={() => onPay(gracing[0].date)}
      className="py-2.5 rounded-2xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50">
      Catch up {gracing[0].date.slice(5)}
    </button>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-xl bg-secondary py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-bold mt-0.5">{v}</div>
    </div>
  );
}
function Legend({ c, t }: { c: string; t: string }) {
  return <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${c}`} />{t}</span>;
}