import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("admin_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBankName(data.bank_name); setAccountNo(data.account_no); setAccountName(data.account_name);
        }
      });
  }, []);

  async function save() {
    setLoading(true);
    const { error } = await supabase.from("admin_settings").update({
      bank_name: bankName, account_no: accountNo, account_name: accountName, updated_at: new Date().toISOString()
    }).eq("id", 1);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bank account updated");
  }

  return (
    <div className="p-6 space-y-5 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-sm text-muted-foreground">This bank account is shown to all users on the Deposit page.</p>

      <div className="card-neon rounded-2xl p-5 space-y-3">
        <div className="font-semibold">Deposit bank account</div>
        <Field label="Bank name" v={bankName} on={setBankName} />
        <Field label="Account number" v={accountNo} on={(v) => setAccountNo(v.replace(/\D/g, "").slice(0, 10))} />
        <Field label="Account name" v={accountName} on={setAccountName} />
        <button onClick={save} disabled={loading}
          className="w-full py-3 rounded-xl gradient-sky text-primary-foreground font-bold glow-neon disabled:opacity-60">
          {loading ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={v} onChange={(e) => on(e.target.value)}
        className="mt-1 w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none" />
    </label>
  );
}
