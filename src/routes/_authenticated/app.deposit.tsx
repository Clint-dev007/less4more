import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ngn } from "@/lib/format";
import { Copy, Check, Loader2, CreditCard } from "lucide-react";
import { SuccessAnimation } from "@/components/success-animation";
import { verifyPaystack } from "@/lib/paystack.functions";

declare global {
  interface Window {
    PaystackPop?: {
      new (config: Record<string, unknown>): { openIframe: () => void };
    };
  }
}

export const Route = createFileRoute("/_authenticated/app/deposit")({
  component: Deposit,
});

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.PaystackPop) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

function Deposit() {
  const { user } = useAuth();
  const [bank, setBank] = useState<{ bank_name: string; account_no: string; account_name: string } | null>(null);
  const [amountStr, setAmountStr] = useState("5000");
  const amount = parseFloat(amountStr) || 0;
  const [ref, setRef] = useState("");
  const [receipt, setReceipt] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<"instant" | "manual">("instant");
  const [paying, setPaying] = useState(false);
  const pskKey = useRef(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string);

  useEffect(() => {
    supabase.from("admin_settings").select("bank_name, account_no, account_name").eq("id", 1).maybeSingle()
      .then(({ data }) => setBank(data));
  }, []);

  async function payWithPaystack() {
    if (!user || amount < 100) { toast.error("Minimum deposit is ₦100"); return; }
    setPaying(true);
    await loadPaystackScript();
    if (!window.PaystackPop) { toast.error("Payment system unavailable"); setPaying(false); return; }

    const reference = `L4M-${user.id.slice(0, 8)}-${Date.now()}`;
    let profileEmail = user.email || `${user.id.slice(0, 8)}@less4more.app`;
    let profileName = "User";

    const { data } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (data?.name) profileName = data.name;

    const { error: insertErr } = await supabase.from("deposits").insert({
      user_id: user.id, amount, ref: reference, provider: "paystack", psk_reference: reference,
    });
    if (insertErr) { toast.error("Could not start payment"); setPaying(false); return; }

    const callbackUrl = `${window.location.origin}/deposit/success`;
    const handler = new window.PaystackPop({
      key: pskKey.current,
      email: profileEmail,
      amount: amount * 100,
      currency: "NGN",
      ref: reference,
      callback: async (response: { reference: string }) => {
        setPaying(false);
        setLoading(true);
        const result = await verifyPaystack({ data: { reference: response.reference } });
        setLoading(false);
        if (result.ok) {
          setSuccess(`₦${result.amount?.toLocaleString()} deposited successfully!`);
        } else {
          toast.error(result.message || "Verification failed — contact support");
        }
      },
      onClose: async () => {
        setPaying(false);
        await supabase.from("deposits").delete().eq("psk_reference", reference).eq("status", "pending");
      },
    });
    handler.openIframe();
  }

  async function submitManual() {
    if (!user) return;
    if (amount < 100 || !ref) { toast.error("Enter amount and reference"); return; }
    if (!receipt) { toast.error("Upload your payment receipt"); return; }
    setLoading(true);
    const { error } = await supabase.from("deposits").insert({ user_id: user.id, amount, ref, receipt_url: receipt });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRef(""); setReceipt("");
    setSuccess("Admin notified — we'll credit your wallet after confirming");
  }

  async function copy() {
    if (!bank) return;
    await navigator.clipboard.writeText(bank.account_no);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Deposit</h1>
      <p className="text-sm text-muted-foreground -mt-2">Fund your wallet instantly or transfer manually.</p>

      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary">
        <button onClick={() => setTab("instant")}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "instant" ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground"}`}>
          <span className="flex items-center justify-center gap-1.5"><CreditCard className="h-4 w-4" /> Pay Now</span>
        </button>
        <button onClick={() => setTab("manual")}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "manual" ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground"}`}>
          Manual transfer
        </button>
      </div>

      {tab === "instant" ? (
        <div className="card-3d rounded-3xl p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter the amount below and tap <b>Fund Wallet</b>. You'll be shown card, bank transfer, USSD and other payment options. Payment is instant.
          </p>
          <label className="block">
            <span className="text-xs text-muted-foreground">Amount (₦)</span>
            <input type="text" inputMode="decimal" value={amountStr}
              onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, ""))}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border text-lg font-bold focus:border-primary focus:outline-none" />
            <div className="text-xs text-muted-foreground mt-1">{ngn(amount)}</div>
          </label>
          <button onClick={payWithPaystack} disabled={loading || paying || amount < 100}
            className="w-full py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary flex items-center justify-center gap-2 disabled:opacity-60">
            {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading payment...</> : loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : `Fund ${ngn(amount)}`}
          </button>
        </div>
      ) : (
        <>
          <div className="card-neon rounded-3xl p-5">
            <div className="text-xs text-muted-foreground">Transfer to</div>
            <div className="font-bold text-lg mt-1">{bank?.bank_name || "—"}</div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-background/50 px-4 py-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Account number</div>
                <div className="font-mono text-xl font-bold tracking-wider">{bank?.account_no || "—"}</div>
              </div>
              <button onClick={copy} className="p-2.5 rounded-xl gradient-primary text-primary-foreground glow-primary">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 text-sm">{bank?.account_name}</div>
          </div>

          <div className="card-3d rounded-3xl p-5 space-y-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Amount you transferred (₦)</span>
              <input type="text" inputMode="decimal" value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, ""))}
                className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border text-lg font-bold focus:border-primary focus:outline-none" />
              <div className="text-xs text-muted-foreground mt-1">{ngn(amount)}</div>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Bank transfer reference</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. TRF/2026/12345"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Payment receipt (screenshot)</span>
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const { fileToCompressedDataUrl } = await import("@/components/success-animation");
                try { setReceipt(await fileToCompressedDataUrl(f)); }
                catch { toast.error("Could not read image"); }
              }} className="mt-1 w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold" />
              {receipt && (
                <img src={receipt} alt="Receipt preview" className="mt-2 max-h-48 rounded-xl border border-border object-contain bg-secondary" />
              )}
            </label>
            <button onClick={submitManual} disabled={loading}
              className="w-full py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-60">
              {loading ? "Sending..." : "Notify admin"}
            </button>
          </div>
        </>
      )}
      <SuccessAnimation show={!!success} message={success ?? ""} onDone={() => setSuccess(null)} />
    </div>
  );
}
