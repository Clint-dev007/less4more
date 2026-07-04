import { createFileRoute, Outlet, Link, useRouterState, useNavigate, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Users, Package, ArrowDownCircle, ArrowUpCircle, Settings, LogOut, ShieldCheck, ArrowLeft, PiggyBank } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
    const hasAdmin = !!roles?.length;
    // Allow access if admin OR if no admin exists yet (so they can claim) OR they're the designated email
    if (!hasAdmin) {
      const { count } = await supabase
        .from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      const isDesignated = u.user.email?.toLowerCase() === "idehenclintonn@gmail.com";
      if ((count ?? 0) > 0 && !isDesignated) throw redirect({ to: "/app" });
    }
  },
  component: AdminShell,
});

function AdminShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const { isAdmin, user, loading } = useAuth();
  const [claimable, setClaimable] = useState(false);
  const [pending, setPending] = useState({ d: 0, w: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const [d, w] = await Promise.all([
        supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setPending({ d: d.count ?? 0, w: w.count ?? 0 });
    };
    load();
    const i = setInterval(load, 2000);
    return () => clearInterval(i);
  }, [isAdmin]);

  useEffect(() => {
    if (loading || !user || isAdmin) return;
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin")
      .then(({ count }) => setClaimable(!count));
  }, [user, isAdmin, loading]);

  async function claim() {
    const { error } = await supabase.rpc("claim_first_admin");
    if (error) { toast.error(error.message); return; }
    toast.success("You are now admin. Reloading…");
    setTimeout(() => window.location.reload(), 500);
  }

  if (loading) return <div className="dark min-h-screen bg-background text-foreground grid place-items-center">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="dark min-h-screen bg-background text-foreground grid place-items-center px-4">
        <div className="card-3d rounded-3xl p-8 max-w-md text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-xl font-bold">Admin access required</h1>
          {claimable ? (
            <>
              <p className="text-sm text-muted-foreground mt-2">No admin exists yet. Claim it now.</p>
              <button onClick={claim} className="mt-4 px-5 py-2.5 rounded-xl gradient-sky text-primary-foreground font-semibold glow-neon">
                Claim admin
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-2">Your account is not an admin.</p>
              <Link to="/app" className="mt-4 inline-block px-5 py-2 rounded-xl bg-secondary font-semibold">Back to app</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const items = [
    { to: "/admin", icon: LayoutDashboard, label: "Overview", exact: true },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/plans", icon: Package, label: "Plans" },
    { to: "/admin/thrift", icon: PiggyBank, label: "Thrift" },
    { to: "/admin/deposits", icon: ArrowDownCircle, label: "Deposits", badge: pending.d },
    { to: "/admin/withdrawals", icon: ArrowUpCircle, label: "Withdrawals", badge: pending.w },
    { to: "/admin/settings", icon: Settings, label: "Settings" },
  ] as Array<{ to: string; icon: typeof LayoutDashboard; label: string; exact?: boolean; badge?: number }>;

  return (
    <div className="dark min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground hidden md:flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2 font-bold text-lg">
          <div className="h-9 w-9 rounded-xl gradient-sky glow-neon grid place-items-center text-primary-foreground text-xs">L4</div>
          less4more <span className="text-primary text-xs ml-1">admin</span>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            const I = it.icon;
            return (
              <Link key={it.to} to={it.to as never}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active ? "gradient-sky text-primary-foreground glow-neon" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                }`}>
                <I className="h-4 w-4" /> <span className="flex-1">{it.label}</span>
                {it.badge ? <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold text-gold-foreground animate-pulse">{it.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
          <Link to="/app" className="block px-3 py-2 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent">← User app</Link>
          <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); }}
            className="w-full text-left px-3 py-2 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-auto">
        {/* mobile top bar */}
        <div className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center gap-2 sticky top-0 z-30">
          <Link to="/app" className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold gradient-primary text-primary-foreground glow-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> User app
          </Link>
          <div className="flex items-center gap-2 overflow-x-auto">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            const I = it.icon;
            return (
              <Link key={it.to} to={it.to as never}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  active ? "gradient-sky text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                <I className="h-3.5 w-3.5" /> {it.label}
                {it.badge ? <span className="ml-1 text-[10px] font-bold px-1.5 rounded-full bg-gold text-gold-foreground">{it.badge}</span> : null}
              </Link>
            );
          })}
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
