import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, TrendingUp, Briefcase, Trophy, Bell, LogOut, Shield, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const { isAdmin, user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const tabs: Array<{ to: string; icon: typeof Home; label: string; exact?: boolean; badge?: number }> = [
    { to: "/app", icon: Home, label: "Home", exact: true },
    { to: "/app/invest", icon: TrendingUp, label: "Invest" },
    { to: "/app/portfolio", icon: Briefcase, label: "Portfolio" },
    { to: "/app/leaderboard", icon: Trophy, label: "Top" },
    { to: "/app/notifications", icon: Bell, label: "Alerts", badge: unread },
  ];

  const tabPaths = new Set(tabs.map((t) => t.to));
  const showBack = !tabPaths.has(path);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto pb-24 relative">
        {/* top right actions */}
        <div className="fixed top-3 right-3 z-50 flex gap-2 max-w-md mx-auto" style={{ left: "auto" }}>
          {isAdmin && (
            <Link to="/admin" className="p-2 rounded-full bg-card border border-border glow-neon" title="Admin">
              <Shield className="h-4 w-4 text-primary" />
            </Link>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); }}
            className="p-2 rounded-full bg-card border border-border" title="Sign out">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {showBack && (
          <button
            onClick={() => { if (window.history.length > 1) window.history.back(); else nav({ to: "/app" }); }}
            className="fixed top-3 left-3 z-50 p-2 rounded-full bg-card border border-border flex items-center gap-1.5 px-3"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Back</span>
          </button>
        )}
        <Outlet />
      </div>

      {/* bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto px-3 pb-3">
          <div className="card-3d rounded-3xl px-2 py-2 flex items-center justify-around">
            {tabs.map((t) => {
              const active = t.exact ? path === t.to : path.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to as never}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition ${
                    active ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground"
                  }`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                  {t.badge ? (
                    <span className="absolute top-0 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center font-bold">
                      {t.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}