import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ngn, relTime } from "@/lib/format";
import { Wallet, Users, Activity, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const [stats, setStats] = useState({ totalInvested: 0, users: 0, active: 0, pendingD: 0, pendingW: 0 });
  const [feed, setFeed] = useState<Array<{ id: string; t: string; at: string }>>([]);

  useEffect(() => {
    const load = async () => {
      const [a, b, c, d, e, f, g] = await Promise.all([
        supabase.from("profiles").select("invested"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("deposits").select("id, amount, created_at, status").order("created_at", { ascending: false }).limit(5),
        supabase.from("withdrawals").select("id, amount, created_at, status").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({
        totalInvested: (a.data ?? []).reduce((s, r) => s + Number(r.invested), 0),
        users: b.count ?? 0,
        active: c.count ?? 0,
        pendingD: d.count ?? 0,
        pendingW: e.count ?? 0,
      });
      const items = [
        ...(f.data ?? []).map((x) => ({ id: "d"+x.id, t: `Deposit ${ngn(x.amount)} · ${x.status}`, at: x.created_at })),
        ...(g.data ?? []).map((x) => ({ id: "w"+x.id, t: `Withdrawal ${ngn(x.amount)} · ${x.status}`, at: x.created_at })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
      setFeed(items);
    };
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);

  const cards = [
    { label: "Total invested", v: ngn(stats.totalInvested), icon: Wallet },
    { label: "Users", v: stats.users.toLocaleString(), icon: Users },
    { label: "Active users", v: stats.active.toLocaleString(), icon: Activity },
    { label: "Pending deposits", v: stats.pendingD.toLocaleString(), icon: Clock },
    { label: "Pending withdrawals", v: stats.pendingW.toLocaleString(), icon: Clock },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => {
          const I = c.icon;
          return (
            <div key={c.label} className="card-neon rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <I className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold mt-2">{c.v}</div>
            </div>
          );
        })}
      </div>
      <div className="card-3d rounded-2xl p-5">
        <div className="font-semibold mb-3">Recent activity</div>
        <div className="space-y-2">
          {feed.length === 0 && <div className="text-sm text-muted-foreground">Nothing yet.</div>}
          {feed.map((f) => (
            <div key={f.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2">
              <span>{f.t}</span>
              <span className="text-xs text-muted-foreground">{relTime(f.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
