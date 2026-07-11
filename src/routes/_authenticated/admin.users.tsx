import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ngn, shortDate } from "@/lib/format";
import { toast } from "sonner";
import { adminDeleteUser } from "@/lib/admin.functions";

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
  const [selected, setSelected] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const deleteUserFn = useServerFn(adminDeleteUser);
  const [topupUser, setTopupUser] = useState<Row | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [topupSaving, setTopupSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("joined_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    const { data: r } = await supabase.from("referrals").select("referrer_id");
    const cnt: Record<string, number> = {};
    (r ?? []).forEach((x) => { cnt[x.referrer_id] = (cnt[x.referrer_id] ?? 0) + 1; });
    setCounts(cnt);
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 2000);
    return () => clearInterval(i);
  }, []);

  async function toggle(id: string, status: string) {
    const next = status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("profiles").update({ status: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`User ${next}`);
    load();
  }

  async function saveName() {
    if (!selected) return;
    const name = editName.trim();
    if (!name) { toast.error("Name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name }).eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Name updated");
    setSelected({ ...selected, name });
    load();
  }

  async function removeUser(id: string, name: string) {
    if (!confirm(`Delete user "${name}"? This is permanent.`)) return;
    try {
      await deleteUserFn({ data: { userId: id } });
      toast.success("User deleted");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function topup() {
    if (!topupUser) return;
    const amt = parseFloat(topupAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setTopupSaving(true);
    const { error } = await supabase.rpc("admin_topup_user_balance", {
      _user_id: topupUser.id,
      _amount: amt,
      _note: topupNote.trim(),
    });
    setTopupSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ngn(amt)} credited to ${topupUser.name || "user"}`);
    setTopupUser(null);
    setTopupAmount("");
    setTopupNote("");
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
              <tr key={u.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer"
                onClick={() => { setSelected(u); setEditName(u.name || ""); }}>
                <td className="px-3 py-3 font-semibold text-primary">{u.name || "—"}</td>
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
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setSelected(u); setEditName(u.name || ""); setTopupUser(u); setTopupAmount(""); setTopupNote(""); }}
                      className="px-2 py-1 rounded-lg bg-success/20 text-success hover:bg-success/30 text-xs font-semibold whitespace-nowrap">
                      Top Up
                    </button>
                    <button onClick={() => toggle(u.id, u.status)}
                      className="px-2 py-1 rounded-lg bg-secondary hover:bg-primary/20 text-xs font-semibold whitespace-nowrap">
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    <button onClick={() => removeUser(u.id, u.name)}
                      className="px-2 py-1 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-xs font-semibold">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelected(null)}>
          <div className="card-3d bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">User details</h2>
                <p className="text-xs font-mono text-muted-foreground break-all">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-2xl leading-none px-2">×</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground">Full name</label>
              <div className="flex gap-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-sm" />
                <button onClick={saveName} disabled={saving}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                  {saving ? "..." : "Save"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Phone" value={selected.phone ?? "—"} />
              <Detail label="Ref code" value={selected.ref_code} mono />
              <Detail label="Balance" value={ngn(selected.balance)} />
              <Detail label="Invested" value={ngn(selected.invested)} />
              <Detail label="Returns" value={ngn(selected.returns)} />
              <Detail label="Referrals" value={String(counts[selected.id] ?? 0)} />
              <Detail label="Status" value={selected.status} />
              <Detail label="Joined" value={shortDate(selected.joined_at)} />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <h3 className="text-xs uppercase text-muted-foreground font-semibold">Bank account</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <Detail label="Bank name" value={selected.bank_name ?? "—"} />
                <Detail label="Account number" value={selected.account_no ?? "—"} mono />
                <Detail label="Account name" value={selected.account_name ?? "—"} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <h3 className="text-xs uppercase text-muted-foreground font-semibold">Top Up Balance</h3>
              <div className="flex gap-2">
                <input type="number" value={selected === topupUser ? topupAmount : ""} placeholder="Amount"
                  onChange={(e) => { setTopupUser(selected); setTopupAmount(e.target.value); }}
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-sm" />
                <input value={selected === topupUser ? topupNote : ""} placeholder="Note (optional)"
                  onChange={(e) => { setTopupUser(selected); setTopupNote(e.target.value); }}
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-sm" />
                <button onClick={async () => {
                  const amt = parseFloat(selected === topupUser ? topupAmount : "");
                  if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
                  setTopupSaving(true);
                  const { error } = await supabase.rpc("admin_topup_user_balance", {
                    _user_id: selected.id, _amount: amt,
                    _note: (selected === topupUser ? topupNote : "").trim(),
                  });
                  setTopupSaving(false);
                  if (error) { toast.error(error.message); return; }
                  toast.success(`${ngn(amt)} credited to ${selected.name || "user"}`);
                  setTopupUser(null); setTopupAmount(""); setTopupNote(""); load();
                }} disabled={topupSaving}
                  className="px-4 py-2 rounded-xl bg-success text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap">
                  {topupSaving ? "..." : "Credit"}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => toggle(selected.id, selected.status)}
                className="flex-1 px-4 py-2 rounded-xl bg-secondary hover:bg-primary/20 text-sm font-semibold">
                {selected.status === "active" ? "Suspend user" : "Activate user"}
              </button>
              <button onClick={() => removeUser(selected.id, selected.name)}
                className="flex-1 px-4 py-2 rounded-xl bg-destructive/20 text-destructive hover:bg-destructive/30 text-sm font-semibold">
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`font-semibold break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
