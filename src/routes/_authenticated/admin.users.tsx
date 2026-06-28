import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ngn, shortDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type Row = {
  id: string; name: string; phone: string | null; balance: number;
  invested: number; returns: number; ref_code: string; status: string;
  bank_name: string | null; account_no: string | null; account_name: string | null;
  joined_at: string;
};

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("joined_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    const { data: r } = await supabase.from("referrals").select("referrer_id");
    const cnt: Record<string, number> = {};
    (r ?? []).forEach((x) => { cnt[x.referrer_id] = (cnt[x.referrer_id] ?? 0) + 1; });
    setCounts(cnt);
  }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, status: string) {
    const next = status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`User ${next}`);
    load();
  }

  const filtered = rows.filter((r) =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.ref_code.includes(q.toUpperCase()) || (r.phone ?? "").includes(q)
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Users ({rows.length})</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code, phone"
          className="px-4 py-2 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-sm w-72" />
      </div>

      <div className="card-3d rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left">
              {["Name","Phone","Code","Balance","Invested","Returns","Refs","Bank","Joined","Status",""].map((h) => (
                <th key={h} className="px-3 py-3 font-semibold text-xs uppercase text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-3 font-semibold">{u.name || "—"}</td>
                <td className="px-3 py-3">{u.phone ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-xs">{u.ref_code}</td>
                <td className="px-3 py-3">{ngn(u.balance)}</td>
                <td className="px-3 py-3">{ngn(u.invested)}</td>
                <td className="px-3 py-3 text-gold">{ngn(u.returns)}</td>
                <td className="px-3 py-3">{counts[u.id] ?? 0}</td>
                <td className="px-3 py-3 text-xs">
                  {u.bank_name ? <><div>{u.bank_name}</div><div className="font-mono text-muted-foreground">{u.account_no}</div></> : "—"}
                </td>
                <td className="px-3 py-3 text-xs">{shortDate(u.joined_at)}</td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.status === "active" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => toggle(u.id, u.status)}
                    className="px-3 py-1 rounded-lg bg-secondary hover:bg-primary/20 text-xs font-semibold whitespace-nowrap">
                    {u.status === "active" ? "Suspend" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
