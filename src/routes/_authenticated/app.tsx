import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, TrendingUp, Briefcase, Trophy, Bell, LogOut, Shield, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ReferralPrompt } from "@/components/referral-prompt";

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
        .eq("user_id", user.id)
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
        <ReferralPrompt />

        {/* WhatsApp floating button */}
        <a
          href="https://chat.whatsapp.com/IJtJJAVdx5j09XxsPsWVei?s=cl&p=a&ilr=4"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-24 left-3 z-50 w-12 h-12 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
          title="Join WhatsApp Group"
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      </div>

      {/* bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto px-3 pb-3">
          <div className="card-3d rounded-3xl px-2 py-2 flex items-center justify-around">
            {tabs.map((t) => {
              const active = t.exact ? path === t.to : path.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to as never} preload="intent"
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