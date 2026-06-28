import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — less4more" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [refCode, setRefCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/app", replace: true });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { name, phone, referral_code: refCode },
          },
        });
        if (error) throw error;
        toast.success("Account created!");
        nav({ to: "/app", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/app", replace: true });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full gradient-primary opacity-30 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full gradient-gold opacity-20 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative card-3d rounded-3xl p-7 w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-1">
          <div className="h-9 w-9 rounded-xl gradient-primary glow-primary grid place-items-center text-primary-foreground text-sm">L4</div>
          less4more
        </Link>
        <h1 className="text-2xl font-bold mt-4">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "signin" ? "Sign in to your wallet" : "Start investing in minutes"}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <>
              <Field label="Full name" value={name} onChange={setName} required />
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="08012345678" />
            </>
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required />
          {mode === "signup" && (
            <Field label="Referral code (optional)" value={refCode} onChange={setRefCode} placeholder="L4MXXXXXX" />
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold glow-primary mt-2 disabled:opacity-60">
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm text-muted-foreground w-full text-center hover:text-primary">
          {mode === "signin" ? "New here? Create account" : "Have an account? Sign in"}
        </button>
      </motion.div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
      />
    </label>
  );
}