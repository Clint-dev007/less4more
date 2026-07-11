import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { relTime } from "@/lib/format";
import { Bell, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  component: Notifications,
});

type N = { id: string; type: string; title: string; body: string; read: boolean; created_at: string };

function Notifications() {
  const { user } = useAuth();
  const [list, setList] = useState<N[]>([]);

  async function load() {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
    setList((data ?? []) as N[]);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function markOne(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setList((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }
  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setList((l) => l.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell /> Notifications</h1>
        <button onClick={markAll} className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-secondary">
          Mark all read
        </button>
      </div>

      <div className="space-y-2">
        {list.length === 0 && <div className="text-sm text-muted-foreground text-center py-10">No notifications.</div>}
        {list.map((n) => (
          <button key={n.id} onClick={() => !n.read && markOne(n.id)}
            className={`w-full text-left card-3d rounded-2xl px-4 py-3 flex items-start gap-3 ${!n.read ? "card-neon" : ""}`}>
            <div className={`h-9 w-9 rounded-full grid place-items-center ${!n.read ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {n.read ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.body}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{relTime(n.created_at)}</div>
            </div>
            {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
          </button>
        ))}
      </div>
    </div>
  );
}
