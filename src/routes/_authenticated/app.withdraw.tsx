import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ngn } from "@/lib/format";
import { SuccessAnimation } from "@/components/success-animation";

export const Route = createFileRoute("/_authenticated/app/withdraw")({
  component: Withdraw,
});

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function Withdraw() {
  const { profile, reload } = useAuth();
  const [bankName, setBankName] = useState(profile?.bank_name ?? "");
  const [accountNo, setAccountNo] = useState(profile?.account_no ?? "");
  const [accountName, setAccountName] = useState(profile?.account_name ?? "");
  const [amountStr, setAmountStr] = useState<string>("");
  const amount = parseFloat(amountStr) || 0;
  const [day, setDay] = useState("Monday");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [qualified, setQualified] = useState<number>(0);

  useEffect(() => {
    if (!profile) return;
    const load = () =>
      supabase.rpc("count_qualified_referrals", { _user_id: profile.id })
        .then(({ data }) => setQualified(Number(data ?? 0)));
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [profile?.id]);

  const canWithdraw = qualified >= 2;
  const remaining = Math.max(0, 2 - qualified);

  async function saveBank() {
    if (accountNo.length !== 10) { toast.error("Account must be 10 digits"); return; }
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({
      bank_name: bankName, account_no: accountNo, account_name: accountName
    }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    reload();
    setSuccess("Bank saved");
  }

  async function submit() {
    if (amount <= 0) { toast.error("Enter amount"); return; }
    if (!profile?.bank_name) { toast.error("Save bank first"); return; }
    if (!canWithdraw) { toast.error(`Invite ${remaining} more friend(s) who invest to unlock withdrawals`); return; }
    setLoading(true);
    const { error } = await supabase.rpc("create_withdrawal", { _amount: amount, _payout_day: day });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setAmountStr("");
    reload();
    setSuccess("Withdrawal submitted");
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Withdraw</h1>
      <div className="rounded-2xl gradient-primary p-4 text-primary-foreground glow-primary">
        <div className="text-xs opacity-80">Available balance</div>
        <div className="text-3xl font-bold mt-1">{ngn(profile?.balance)}</div>
      </div>

      <div className={`card-3d rounded-3xl p-4 ${canWithdraw ? "" : "border border-gold/40"}`}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Referral requirement</div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${canWithdraw ? "bg-primary/15 text-primary" : "bg-gold/15 text-gold"}`}>
            {canWithdraw ? "Unlocked" : "Locked"}
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Invite 2 friends who invest in any plan to unlock withdrawals.
        </div>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full gradient-gold transition-all" style={{ width: `${Math.min(100, (qualified / 2) * 100)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Qualified referrals</span>
          <span className="font-bold">{qualified}/2</span>
        </div>
        {!canWithdraw && (
          <div className="mt-2 text-xs text-gold">Your code: <span className="font-mono font-bold">{profile?.ref_code}</span></div>
        )}
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
          <input type="text" inputMode="decimal" value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, ""))}
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
          {loading ? "Submitting…" : canWithdraw ? "Submit request" : `Invite ${remaining} more to unlock`}
        </button>
      </div>
      <SuccessAnimation show={!!success} message={success ?? ""} onDone={() => setSuccess(null)} />
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
