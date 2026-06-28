import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "less4more — Invest small, grow big" },
      { name: "description", content: "Nigeria's mobile-first thrift and investment platform. Start from ₦5,000." },
      { property: "og:title", content: "less4more — Invest small, grow big" },
      { property: "og:description", content: "Nigeria's mobile-first thrift and investment platform." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full gradient-primary opacity-30 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full gradient-gold opacity-25 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="h-9 w-9 rounded-xl gradient-primary glow-primary grid place-items-center text-primary-foreground">L4</div>
          <span>less4more</span>
        </div>
        <Link to="/auth" className="px-4 py-2 rounded-full gradient-primary text-primary-foreground font-semibold glow-primary text-sm">
          Get started
        </Link>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card border border-border text-sm mb-6 card-3d">
            <Sparkles className="h-4 w-4 text-gold" />
            <span>Earn up to 40% returns in 90 days</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
            <span className="shimmer-text">Invest small.</span><br />
            Grow <span className="text-primary">big</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-balance">
            Nigeria's mobile-first thrift platform. Start from ₦5,000, track your portfolio in real time, and earn from referrals.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth" className="px-7 py-3.5 rounded-full gradient-primary text-primary-foreground font-bold glow-primary animate-pulse-glow">
              Open free account
            </Link>
          </div>
        </motion.div>

        <div className="mt-20 grid md:grid-cols-3 gap-5">
          {[
            { icon: TrendingUp, t: "5 active plans", d: "Thrift, agriculture, property & finance — pick your pace." },
            { icon: Shield, t: "Wallet-safe", d: "Funds locked per plan, withdrawals on your chosen day." },
            { icon: Users, t: "Earn referring", d: "10% bonus credited the moment your friend invests." },
          ].map(({ icon: Icon, t, d }) => (
            <motion.div key={t} whileHover={{ y: -4 }}
              className="card-3d rounded-3xl p-6">
              <div className="h-11 w-11 rounded-2xl gradient-primary grid place-items-center glow-primary mb-4">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{d}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
