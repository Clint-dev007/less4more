import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ngn } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/thrift")({
  component: AdminThrift,
});

type Plan = {
  id: string; user_id: string; daily_amount: number; cycle_length: number;
  fee_percent: number; start_date: string; status: string;
  name?: string | null;
};
type Fee = { cycle_length: number; fee_percent: number };
type Payout = { payout_amount: number; fee_deducted: number; total_saved: number };

function AdminThrift() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [missed, setMissed] = useState<Array<{ user_id: string; count: number; name: string | null }>>([]);

  async function load() {
    const [{ data: p }, { data: f }, { data: pay }, { data: miss }] = await Promise.all([
      supabase.from("thrift_plans").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("thrift_fee_settings").select("*").order("cycle_length"),
      supabase.from("thrift_payouts").select("payout_amount, fee_deducted, total_saved"),
      supabase.from("thrift_contributions").select("user_id, status").eq("status", "missed"),
    ]);
    const rawPlans = (p ?? []) as Plan[];
    const ids = Array.from(new Set(rawPlans.map((x) => x.user_id)));
    const nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id,name").in("id", ids);
      (ps ?? []).forEach((r: { id: string; name: string }) => { nameMap[r.id] = r.name; });
    }
    setPlans(rawPlans.map((r) => ({ ...r, name: nameMap[r.user_id] ?? null })));
    setFees((f ?? []) as Fee[]);
    setPayouts((pay ?? []) as Payout[]);
    // aggregate missed per user
    const agg: Record<string, number> = {};
    (miss ?? []).forEach((r: { user_id: string }) => { agg[r.user_id] = (agg[r.user_id] ?? 0) + 1; });
    const names: Record<string, string> = {};
    if (Object.keys(agg).length) {
      const { data: profs } = await supabase.from("profiles").select("id,name").in("id", Object.keys(agg));
      (profs ?? []).forEach((r: { id: string; name: string }) => { names[r.id] = r.name; });
    }
    setMissed(Object.entries(agg).map(([user_id, count]) => ({ user_id, count, name: names[user_id] ?? null })).sort((a, b) => b.count - a.count));
  }
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  const activeCount = plans.filter((p) => p.status === "active").length;
  const totalCollected = plans.reduce((s, p) => s + Number(p.daily_amount) * p.cycle_length, 0);
  const totalFees = payouts.reduce((s, p) => s + Number(p.fee_deducted), 0);

  async function updateFee(cycle: number, val: number) {
    const { error } = await supabase.from("thrift_fee_settings").update({ fee_percent: val, updated_at: new Date().toISOString() }).eq("cycle_length", cycle);
    if (error) return toast.error(error.message);
    toast.success("Fee updated");
    load();
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Thrift plans</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Active plans" v={String(activeCount)} />
        <Kpi label="Total plans" v={String(plans.length)} />
        <Kpi label="Total committed" v={ngn(totalCollected)} />
        <Kpi label="Fees earned" v={ngn(totalFees)} />
      </div>

      <div className="card-3d rounded-2xl p-4">
        <div className="text-sm font-semibold mb-3">Fee % per cycle length</div>
        <div className="grid grid-cols-3 gap-3">
          {fees.map((f) => (
            <div key={f.cycle_length} className="rounded-xl bg-secondary p-3">
              <div className="text-[11px] uppercase text-muted-foreground">{f.cycle_length}-day</div>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" step="0.5" defaultValue={f.fee_percent}
                  onBlur={(e) => updateFee(f.cycle_length, Number(e.target.value))}
                  className="w-20 h-9 rounded-lg bg-background px-2 text-sm border border-border" />
                <span className="text-sm">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-3d rounded-2xl p-4">
        <div className="text-sm font-semibold mb-3">All plans</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2">User</th><th>Daily</th><th>Cycle</th><th>Fee</th><th>Start</th><th>Status</th></tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2">{p.name ?? p.user_id.slice(0, 8)}</td>
                  <td>{ngn(p.daily_amount)}</td>
                  <td>{p.cycle_length}d</td>
                  <td>{p.fee_percent}%</td>
                  <td>{p.start_date}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-[10px] ${p.status === "active" ? "bg-success/20 text-success" : "bg-secondary"}`}>{p.status}</span></td>
                </tr>
              ))}
              {plans.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No plans yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-3d rounded-2xl p-4">
        <div className="text-sm font-semibold mb-3">Missed payments report</div>
        {missed.length === 0 ? (
          <div className="text-xs text-muted-foreground">No missed contributions 🎉</div>
        ) : (
          <div className="space-y-2">
            {missed.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between text-sm bg-secondary rounded-lg px-3 py-2">
                <span>{m.name ?? m.user_id.slice(0, 8)}</span>
                <span className="text-destructive font-bold">{m.count} missed</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, v }: { label: string; v: string }) {
  return (
    <div className="card-3d rounded-2xl p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-0.5">{v}</div>
    </div>
  );
}