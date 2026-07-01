import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ngn, relTime } from "@/lib/format";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { SuccessAnimation } from "@/components/success-animation";

export const Route = createFileRoute("/_authenticated/admin/deposits")({
  component: DepositsAdmin,
});

type D = {
  id: string; amount: number; ref: string; status: string; created_at: string; user_id: string;
  profiles: { name: string; phone: string | null; ref_code: string } | null;
};

function DepositsAdmin() {
  const [rows, setRows] = useState<D[]>([]);
  const [filter, setFilter] = useState("pending");
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    let q = supabase.from("deposits").select("id, amount, ref, status, created_at, user_id, profiles(name, phone, ref_code)").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter as never);
    const { data } = await q;
    setRows((data ?? []) as unknown as D[]);
  }
  useEffect(() => {
    load();
    const i = setInterval(load, 2000);
    return () => clearInterval(i);
  }, [filter]);

  async function approve(id: string) {
    const { error } = await supabase.rpc("approve_deposit", { _deposit_id: id });
    if (error) { toast.error(error.message); return; }
    setSuccess("Deposit approved");
    load();
  }
  async function reject(id: string) {
    const { error } = await supabase.rpc("reject_deposit", { _deposit_id: id });
    if (error) { toast.error(error.message); return; }
    setSuccess("Deposit rejected");
    load();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deposits</h1>
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
              {["User","Amount","Reference","When","Status",""].map((h) => (
                <th key={h} className="px-3 py-3 text-xs uppercase text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">None</td></tr>}
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-3 py-3">
                  <div className="font-semibold">{d.profiles?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{d.profiles?.phone || d.profiles?.ref_code}</div>
                </td>
                <td className="px-3 py-3 font-bold">{ngn(d.amount)}</td>
                <td className="px-3 py-3 font-mono text-xs">{d.ref}</td>
                <td className="px-3 py-3 text-xs">{relTime(d.created_at)}</td>
                <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                  d.status === "pending" ? "bg-gold/20 text-gold" :
                  d.status === "approved" ? "bg-success/20 text-success" :
                  "bg-destructive/20 text-destructive"
                }`}>{d.status}</span></td>
                <td className="px-3 py-3">
                  {d.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => approve(d.id)} className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30"><Check className="h-4 w-4" /></button>
                      <button onClick={() => reject(d.id)} className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SuccessAnimation show={!!success} message={success ?? ""} onDone={() => setSuccess(null)} />
    </div>
  );
}
