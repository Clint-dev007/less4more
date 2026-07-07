import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ngn } from "@/lib/format";
import { Copy, Check } from "lucide-react";
import { SuccessAnimation, fileToCompressedDataUrl } from "@/components/success-animation";
import { ExternalLink } from "lucide-react";

const FLW_PAY_LINK = "https://flutterwave.com/pay/tds7y7v2kdrd";

export const Route = createFileRoute("/_authenticated/app/deposit")({
  component: Deposit,
});

function Deposit() {
  const { user } = useAuth();
  const [bank, setBank] = useState<{ bank_name: string; account_no: string; account_name: string } | null>(null);
  const [amountStr, setAmountStr] = useState<string>("5000");
  const amount = parseFloat(amountStr) || 0;
  const [ref, setRef] = useState("");
  const [receipt, setReceipt] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<"instant" | "manual">("instant");
  const [profileName, setProfileName] = useState<string>("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [linkOpened, setLinkOpened] = useState(false);

  useEffect(() => {
    supabase.from("admin_settings").select("bank_name, account_no, account_name").eq("id", 1).maybeSingle()
      .then(({ data }) => setBank(data));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => { setProfileName(data?.name ?? ""); setProfilePhone(data?.phone ?? ""); });
  }, [user?.id]);
  void profileName; void profilePhone;

  async function submit() {
    if (!user) return;
    if (amount < 100 || !ref) { toast.error("Enter amount and reference"); return; }
    if (!receipt) { toast.error("Upload your payment receipt"); return; }
    setLoading(true);
    const { error } = await supabase.from("deposits").insert({ user_id: user.id, amount, ref, receipt_url: receipt });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRef(""); setReceipt("");
    setSuccess("Admin notified");
  }

  async function submitInstant() {
    if (!user) return;
    if (amount < 100 || !ref) { toast.error("Enter amount and Flutterwave transaction reference"); return; }
    if (!receipt) { toast.error("Upload your payment confirmation screenshot"); return; }
    setLoading(true);
    const { error } = await supabase.from("deposits").insert({
      user_id: user.id, amount, ref, receipt_url: receipt, provider: "flutterwave_link",
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRef(""); setReceipt(""); setLinkOpened(false);
    setSuccess("Payment submitted — we'll credit your wallet after confirming");
  }

  async function copy() {
    if (!bank) return;
    await navigator.clipboard.writeText(bank.account_no);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Deposit</h1>
      <p className="text-sm text-muted-foreground -mt-2">Fund your wallet instantly with card / bank, or transfer manually.</p>

      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary">
        <button onClick={() => setTab("instant")}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "instant" ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground"}`}>
          ⚡ Instant (Card)
        </button>
        <button onClick={() => setTab("manual")}
          className={`py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "manual" ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground"}`}>
          🏦 Manual transfer
        </button>
      </div>

      {tab === "instant" ? (
        <div className="card-3d rounded-3xl p-5 space-y-3">
          <div className="text-xs text-muted-foreground">
            Tap <b>Pay now</b> to open the secure Flutterwave payment page. Enter the amount you want to deposit there,
            complete payment, then come back and submit the same amount + transaction reference below so we can credit your wallet.
          </div>
          <a
            href={FLW_PAY_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setLinkOpened(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary"
          >
            <ExternalLink className="h-4 w-4" /> Pay now on Flutterwave
          </a>

          <div className="pt-2 space-y-3">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">After paying</div>
            <label className="block">
              <span className="text-xs text-muted-foreground">Amount you paid (₦)</span>
              <input type="text" inputMode="decimal" value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, ""))}
                className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border text-lg font-bold focus:border-primary focus:outline-none" />
              <div className="text-xs text-muted-foreground mt-1">{ngn(amount)}</div>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Flutterwave transaction reference</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. FLW-MOCK-... or shown after payment"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Payment confirmation screenshot</span>
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                try { setReceipt(await fileToCompressedDataUrl(f)); }
                catch { toast.error("Could not read image"); }
              }} className="mt-1 w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold" />
              {receipt && (
                <img src={receipt} alt="Receipt preview" className="mt-2 max-h-48 rounded-xl border border-border object-contain bg-secondary" />
              )}
            </label>
            <button onClick={submitInstant} disabled={loading || !linkOpened}
              className="w-full py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-60">
              {loading ? "Sending…" : linkOpened ? "Submit for confirmation" : "Open payment link first"}
            </button>
          </div>
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
            try { setReceipt(await fileToCompressedDataUrl(f)); }
            catch { toast.error("Could not read image"); }
          }} className="mt-1 w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:font-semibold" />
          {receipt && (
            <img src={receipt} alt="Receipt preview" className="mt-2 max-h-48 rounded-xl border border-border object-contain bg-secondary" />
          )}
        </label>
        <button onClick={submit} disabled={loading}
          className="w-full py-3.5 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-60">
          {loading ? "Sending…" : "Notify admin"}
        </button>
          </div>
        </>
      )}
      <SuccessAnimation show={!!success} message={success ?? ""} onDone={() => setSuccess(null)} />
    </div>
  );
}
