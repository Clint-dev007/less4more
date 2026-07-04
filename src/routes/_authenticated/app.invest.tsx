import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn } from "@/lib/format";
import { toast } from "sonner";
import { X, Sparkles } from "lucide-react";
import { SuccessAnimation } from "@/components/success-animation";

export const Route = createFileRoute("/_authenticated/app/invest")({
  component: InvestPage,
});

type Plan = {
  id: string; name: string; icon: string; category: string;
  roi: number; duration_days: number; min_amount: number;
  description: string; active: boolean;
  subtype: string | null; image_url: string | null;
};

const CATS = [
  { id: "thrift", label: "Thrift" },
  { id: "agriculture", label: "Agro" },
  { id: "property", label: "Property" },
  { id: "finance", label: "Finance" },
  { id: "poultry", label: "Poultry" },
];

function InvestPage() {
  const { profile, reload } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cat, setCat] = useState("thrift");
  const [sub, setSub] = useState<"all" | "chicken" | "pig">("all");
  const [open, setOpen] = useState<Plan | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("plans").select("*").eq("active", true).order("min_amount")
      .then(({ data }) => setPlans((data ?? []) as Plan[]));
  }, []);

  const filtered = useMemo(
    () => plans
      .filter((p) => p.category === cat)
      .filter((p) => cat !== "poultry" || sub === "all" || p.subtype === sub)
      .sort((a, b) => {
        if (a.category === "poultry" && b.category === "poultry") {
          return (a.subtype ?? "").localeCompare(b.subtype ?? "");
        }
        return 0;
      }),
    [plans, cat, sub]
  );

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Invest</h1>
      <p className="text-sm text-muted-foreground -mt-2">Wallet: {ngn(profile?.balance)}</p>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {CATS.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              cat === c.id ? "gradient-primary text-primary-foreground glow-primary" : "bg-card border border-border text-muted-foreground"
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      {cat === "poultry" && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {(["all", "chicken", "pig"] as const).map((s) => (
            <button key={s} onClick={() => setSub(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                sub === s ? "gradient-gold text-gold-foreground glow-gold" : "bg-secondary text-muted-foreground"
              }`}>
              {s === "chicken" ? "🐔 Chicken" : s === "pig" ? "🐖 Pig" : "All poultry"}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((p) => (
          <motion.button key={p.id} onClick={() => setOpen(p)} whileTap={{ scale: 0.98 }}
            className="w-full text-left card-3d rounded-3xl p-4">
            <div className="flex items-start gap-3">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-16 w-16 rounded-2xl object-cover glow-primary" />
              ) : (
                <div className="h-14 w-14 rounded-2xl gradient-primary glow-primary grid place-items-center text-2xl animate-float">
                  {p.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {p.name}
                    {p.category === "poultry" && p.subtype && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary uppercase">{p.subtype}</span>
                    )}
                  </div>
                  <div className="text-gold font-bold">+{p.roi}%</div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                <div className="mt-2 flex gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-secondary">{p.duration_days} days</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary">min {ngn(p.min_amount)}</span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <InvestModal plan={open} balance={Number(profile?.balance ?? 0)}
            onClose={() => setOpen(null)}
            onDone={(name) => { reload(); setOpen(null); setSuccess(`Invested in ${name}`); }} />
        )}
      </AnimatePresence>

      <SuccessAnimation show={!!success} message={success ?? ""} onDone={() => setSuccess(null)} />
    </div>
  );
}

function InvestModal({ plan, balance, onClose, onDone }: {
  plan: Plan; balance: number; onClose: () => void; onDone: (planName: string) => void;
}) {
  const [amountStr, setAmountStr] = useState<string>(String(plan.min_amount));
  const amount = parseFloat(amountStr) || 0;
  const [loading, setLoading] = useState(false);
  const expected = amount * (1 + plan.roi / 100);

  async function submit() {
    if (amount < plan.min_amount) { toast.error("Below minimum"); return; }
    if (amount > balance) { toast.error("Insufficient wallet balance"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("create_investment", { _plan_id: plan.id, _amount: amount });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    onDone(plan.name);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md card-3d rounded-t-3xl sm:rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl gradient-primary grid place-items-center text-2xl glow-primary">{plan.icon}</div>
            <div>
              <div className="font-bold">{plan.name}</div>
              <div className="text-xs text-muted-foreground">{plan.duration_days} days · +{plan.roi}%</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <p className="text-sm text-muted-foreground mt-3">{plan.description}</p>

        <label className="block mt-4">
          <span className="text-xs text-muted-foreground">Amount</span>
          <input type="text" inputMode="decimal" value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, ""))}
            className="mt-1 w-full px-4 py-3 rounded-xl bg-secondary border border-border text-lg font-bold focus:border-primary focus:outline-none" />
        </label>
        <div className="flex gap-1.5 mt-2">
          {[plan.min_amount, plan.min_amount * 2, plan.min_amount * 5, plan.min_amount * 10].map((v) => (
            <button key={v} onClick={() => setAmountStr(String(v))}
              className="flex-1 py-1.5 rounded-full bg-secondary text-xs font-semibold hover:bg-primary/10">
              {ngn(v)}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl gradient-primary p-4 text-primary-foreground glow-primary">
          <div className="flex items-center gap-2 text-xs opacity-90">
            <Sparkles className="h-3.5 w-3.5" /> Expected return after {plan.duration_days} days
          </div>
          <div className="text-3xl font-bold mt-1">{ngn(expected)}</div>
          <div className="text-xs opacity-80 mt-0.5">Profit: {ngn(expected - amount)}</div>
        </div>

        <button onClick={submit} disabled={loading}
          className="mt-4 w-full py-3.5 rounded-2xl gradient-gold text-gold-foreground font-bold glow-gold disabled:opacity-60">
          {loading ? "Processing…" : "Confirm investment"}
        </button>
        <div className="text-[11px] text-muted-foreground text-center mt-2">Wallet: {ngn(balance)}</div>
      </motion.div>
    </motion.div>
  );
}
