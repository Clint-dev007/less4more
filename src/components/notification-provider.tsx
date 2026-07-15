import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { initPushNotifications, requestNotificationPermission, showLocalNotification } from "@/lib/notifications";
import { playNotificationSound } from "@/lib/sounds";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const { data } = await supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) {
        await supabase.from("notification_settings").insert({ user_id: user.id });
        setShowPrompt(true);
      } else if (data.push_enabled) {
        initPushNotifications(user.id);
      }
      setSettingsLoaded(true);
    };
    loadSettings();
  }, [user]);

  useEffect(() => {
    if (!user || !settingsLoaded) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new as { title: string; body: string; type: string };

          const { data: settings } = await supabase
            .from("notification_settings")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (settings?.sound_enabled) playNotificationSound();
          if (settings?.push_enabled) showLocalNotification(n.title, n.body);

          toast(n.title, { description: n.body });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, settingsLoaded]);

  async function handleAllow() {
    if (!user) return;
    const granted = await requestNotificationPermission(user.id);
    if (granted) toast.success("Notifications enabled!");
    setShowPrompt(false);
  }

  function handleDeny() {
    setShowPrompt(false);
  }

  if (!showPrompt) return <>{children}</>;

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
        <div className="card-3d rounded-3xl p-6 w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">🔔</div>
          <h2 className="text-lg font-bold">Stay Updated</h2>
          <p className="text-sm text-muted-foreground">
            Allow Less4More to send you notifications for deposits, investments, referrals, and more?
          </p>
          <button
            onClick={handleAllow}
            className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary"
          >
            Allow Notifications
          </button>
          <button onClick={handleDeny} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition">
            Not now
          </button>
        </div>
      </div>
    </>
  );
}
