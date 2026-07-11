import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X } from "lucide-react";

export function ReferralPrompt() {
  const { profile, reload } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!profile || profile.referral_prompted || dismissed) return null;

  async function apply() {
    if (!code.trim()) { toast.error("Enter a referral code"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("apply_referral_code", { _code: code.trim() });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Referral applied!");
    reload();
    setDismissed(true);
  }

  async function skip() {
    await supabase.rpc("skip_referral_prompt");
    reload();
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="card-3d rounded-3xl p-6 w-full max-w-sm space-y-4 relative">
          <button onClick={skip} className="absolute top-3 right-3 p-1.5 rounded-full bg-secondary text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="h-14 w-14 rounded-2xl gradient-gold grid place-items-center glow-gold mx-auto">
            <Gift className="h-7 w-7 text-gold-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">Have a referral code?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter a friend's code to give them a 10% bonus on your first investment.
            </p>
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. L4MXXXXXX"
            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-center font-mono text-lg font-bold tracking-wider focus:border-primary focus:outline-none uppercase" />
          <button onClick={apply} disabled={loading}
            className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-60">
            {loading ? "Applying..." : "Apply code"}
          </button>
          <button onClick={skip}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition">
            Skip for now
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
