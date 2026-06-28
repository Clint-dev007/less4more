import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ngn } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/withdraw")({
  component: Withdraw,
});

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function Withdraw() {
  const { profile, reload } = useAuth();
  const [bankName, setBankName] = useState(profile?.bank_name ?? "");
  const [accountNo, setAccountNo] = useState(profile?.account_no ?? "");
  const [accountName, setAccountName] = useState(profile?.account_name ?? "");
  const [amount, setAmount] = useState<number>(0);
  const [day, setDay] = useState("Monday");
  const [loading, setLoading] = useState(false);

  async function saveBank() {
    if (accountNo.length !== 10) { toast.error("Account must be 10 digits"); return; }
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({
      bank_name: bankName, account_no: accountNo, account_name: accountName
    }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Bank saved");
    reload();
  }

  async function submit() {
    if (amount <= 0) { toast.error("Enter amount"); return; }
    if (!profile?.bank_name) { toast.error("Save bank first"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("create_withdrawal", { _amount: amount, _payout_day: day });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Withdrawal request submitted");
    setAmount(0);
    reload();
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Withdraw</h1>
      <div className="rounded-2xl gradient-primary p-4 text-primary-foreground glow-primary">
        <div className="text-xs opacity-80">Available balance</div>
        <div className="text-3xl font-bold mt-1">{ngn(profile?.balance)}</div>
      </div>

      <div className="card-3d rounded-3xl p-5 space-y-3">
        <div className="font-semibold">Your bank account</div>
        <Field label="Bank name" value={bankName} onChange={setBankName} placeholder="e.g. GTBank" />
        <Field label="Account number" value={accountNo} onChange={(v) => setAccountNo(v.replace(/\D/g, "").slice(0, 10))} placeholder="10 digits" />
        <Field label="Account name" value={accountName} onChange={setAccountName} />
        <button onClick={saveBank} className="w-full py-2.5 rounded-xl bg-secondary font-semibold text-sm">Save bank</button>
      </div>

      <div className="card-3d rounded-3xl p-5 space-y-3">
        <div className="font-semibold">Request payout</div>
        <label className="block">
          <span className="text-xs text-muted-foreground">Amount (₦)</span>
          <input type="number" value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border text-lg font-bold focus:border-primary focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Preferred payout day</span>
          <select value={day} onChange={(e) => setDay(e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none">
            {DAYS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <button onClick={submit} disabled={loading}
          className="w-full py-3.5 rounded-2xl gradient-gold text-gold-foreground font-bold glow-gold disabled:opacity-60">
          {loading ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none" />
    </label>
  );
}
