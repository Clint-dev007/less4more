import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Bell, Volume2, VolumeX, Smartphone, TrendingUp, ArrowUpCircle, Users, Vibrate } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/notification-settings")({ component: NotificationSettings });

type NS = {
  sound_enabled: boolean;
  vibration_enabled: boolean;
  promotional: boolean;
  investment: boolean;
  withdrawal: boolean;
  referral: boolean;
  push_enabled: boolean;
};

function Toggle({ label, icon: Icon, value, onChange }: { label: string; icon: typeof Bell; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-secondary"}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function NotificationSettings() {
  const { user } = useAuth();
  const [s, setS] = useState<NS>({
    sound_enabled: true, vibration_enabled: true, promotional: true,
    investment: true, withdrawal: true, referral: true, push_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setS({
          sound_enabled: data.sound_enabled,
          vibration_enabled: data.vibration_enabled,
          promotional: data.promotional,
          investment: data.investment,
          withdrawal: data.withdrawal,
          referral: data.referral,
          push_enabled: data.push_enabled,
        });
        setLoading(false);
      });
  }, [user]);

  async function update(key: keyof NS, value: boolean) {
    setS((prev) => ({ ...prev, [key]: value }));
    if (!user) return;
    const { error } = await supabase.from("notification_settings").upsert({
      user_id: user.id,
      [key]: value,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) toast.error("Failed to update");
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings /> Notification Settings
      </h1>

      <div className="card-3d rounded-2xl p-4 space-y-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">General</div>
        <Toggle label="Push Notifications" icon={Smartphone} value={s.push_enabled} onChange={(v) => update("push_enabled", v)} />
        <Toggle label="Notification Sound" icon={s.sound_enabled ? Volume2 : VolumeX} value={s.sound_enabled} onChange={(v) => update("sound_enabled", v)} />
        <Toggle label="Vibration" icon={Vibrate} value={s.vibration_enabled} onChange={(v) => update("vibration_enabled", v)} />
      </div>

      <div className="card-3d rounded-2xl p-4 space-y-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Categories</div>
        <Toggle label="Investment Updates" icon={TrendingUp} value={s.investment} onChange={(v) => update("investment", v)} />
        <Toggle label="Withdrawal Updates" icon={ArrowUpCircle} value={s.withdrawal} onChange={(v) => update("withdrawal", v)} />
        <Toggle label="Referral Updates" icon={Users} value={s.referral} onChange={(v) => update("referral", v)} />
        <Toggle label="Promotions & Bonuses" icon={Bell} value={s.promotional} onChange={(v) => update("promotional", v)} />
      </div>
    </div>
  );
}
