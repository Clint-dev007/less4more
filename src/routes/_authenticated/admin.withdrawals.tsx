import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ngn, relTime } from "@/lib/format";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: WdAdmin,
});

type W = {
  id: string; amount: number; status: string; created_at: string; user_id: string;
  bank_name: string; account_no: string; account_name: string; payout_day: string;
  profiles: { name: string; phone: string | null; ref_code: string } | null;
};

function WdAdmin() {
  const [rows, setRows] = useState<W[]>([]);
  const [filter, setFilter] = useState("pending");

  async function load() {
    let q = supabase.from("withdrawals").select("id, amount, status, created_at, user_id, bank_name, account_no, account_name, payout_day, profiles(name, phone, ref_code)").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter as never);
    const { data } = await q;
    setRows((data ?? []) as unknown as W[]);
  }
  useEffect(() => { load(); }, [filter]);

  async function approve(id: string) {
    const { error } = await supabase.rpc("approve_withdrawal", { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Approved");
    load();
  }
  async function reject(id: string) {
    const { error } = await supabase.rpc("reject_withdrawal", { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Rejected & funds returned");
    load();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <div className="flex gap-1">
          {["pending","approved","rejected","all"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${filter === s ? "gradient-sky text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card-3d rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left">
              {["User","Amount","Bank","Account","Payout day","When","Status",""].map((h) => (
                <th key={h} className="px-3 py-3 text-xs uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">None</td></tr>}
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-3 py-3">
                  <div className="font-semibold">{w.profiles?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{w.profiles?.phone || w.profiles?.ref_code}</div>
                </td>
                <td className="px-3 py-3 font-bold">{ngn(w.amount)}</td>
                <td className="px-3 py-3 text-xs">{w.bank_name}</td>
                <td className="px-3 py-3 text-xs">
                  <div className="font-mono">{w.account_no}</div>
                  <div className="text-muted-foreground">{w.account_name}</div>
                </td>
                <td className="px-3 py-3 text-xs">{w.payout_day}</td>
                <td className="px-3 py-3 text-xs">{relTime(w.created_at)}</td>
                <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                  w.status === "pending" ? "bg-gold/20 text-gold" :
                  w.status === "approved" ? "bg-success/20 text-success" :
                  "bg-destructive/20 text-destructive"
                }`}>{w.status}</span></td>
                <td className="px-3 py-3">
                  {w.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => approve(w.id)} className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30"><Check className="h-4 w-4" /></button>
                      <button onClick={() => reject(w.id)} className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
