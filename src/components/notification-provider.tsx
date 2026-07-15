import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { initPushNotifications, requestNotificationPermission, showLocalNotification } from "@/lib/notifications";
import { playNotificationSound } from "@/lib/sounds";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const settingsRef = useRef({ sound: true, push: true });

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const { data } = await supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) {
        await supabase.from("notification_settings").insert({ user_id: user.id });
        setShowPrompt(true);
      } else {
        settingsRef.current = { sound: data.sound_enabled !== false, push: data.push_enabled !== false };
        if (data.push_enabled) initPushNotifications(user.id);
      }
    };
    loadSettings();
  }, [user]);

  const handleNewNotification = useCallback(async (payload: any) => {
    const n = payload.new as { title: string; body: string; type: string };

    playNotificationSound();

    if (settingsRef.current.push) {
      showLocalNotification(n.title, n.body);
    }

    toast(n.title, { description: n.body });
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        handleNewNotification
      )
      .subscribe((status) => {
        console.log("Notifications channel status:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [user, handleNewNotification]);

  async function handleAllow() {
    if (!user) return;
    const granted = await requestNotificationPermission(user.id);
    if (granted) {
      settingsRef.current = { ...settingsRef.current, push: true };
      toast.success("Notifications enabled!");
      await supabase.from("notification_settings").upsert({
        user_id: user.id,
        push_enabled: true,
        sound_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }
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
            Allow Less4More to send you notifications for deposits, investments, referrals, and admin announcements?
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
