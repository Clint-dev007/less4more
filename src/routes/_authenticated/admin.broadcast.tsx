import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Megaphone, Send, Users, Eye } from "lucide-react";
import { relTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/broadcast")({ component: AdminBroadcast });

function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; body: string; created_at: string }>>([]);

  useEffect(() => {
    const load = async () => {
      const [users, online, anns] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.rpc("get_online_users", { _seconds: 300 }),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      setTotalUsers(users.count ?? 0);
      if (online.data) setOnlineUsers(online.data.map((o: { user_id: string }) => o.user_id));
      setAnnouncements(anns.data ?? []);
    };
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  async function broadcast() {
    if (!title.trim() || !body.trim()) { toast.error("Fill in title and message"); return; }
    setLoading(true);

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    try {
      const { data: allUsers, error: usersErr } = await supabase.from("profiles").select("id");
      if (usersErr) { toast.error("Failed to fetch users: " + usersErr.message); setLoading(false); return; }
      if (!allUsers || allUsers.length === 0) { toast.error("No users found"); setLoading(false); return; }

      const notifications = allUsers.map((u) => ({
        user_id: u.id,
        title: trimmedTitle,
        body: trimmedBody,
        type: "announcement",
        read: false,
      }));

      const BATCH_SIZE = 50;
      for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
        const batch = notifications.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("notifications").insert(batch);
        if (error) {
          console.error("Notification insert error:", error);
          toast.error("Failed to send notifications: " + error.message);
          setLoading(false);
          return;
        }
      }

      const { error: annErr } = await supabase.from("announcements").insert({
        title: trimmedTitle,
        body: trimmedBody,
      });
      if (annErr) console.warn("Announcement save failed (non-critical):", annErr.message);

      toast.success(`Broadcast sent to ${allUsers.length} users!`);
      setTitle("");
      setBody("");
    } catch (e: any) {
      console.error("Broadcast error:", e);
      toast.error("Something went wrong: " + (e.message || "unknown"));
    }
    setLoading(false);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Megaphone /> Broadcast
      </h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-neon rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Total Users
          </div>
          <div className="text-2xl font-bold mt-1">{totalUsers}</div>
        </div>
        <div className="card-neon rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5 text-green-400" /> Online Now
          </div>
          <div className="text-2xl font-bold mt-1">{onlineUsers.length}</div>
        </div>
      </div>

      <div className="card-neon rounded-2xl p-5 space-y-4">
        <div className="font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" /> Send Announcement
        </div>
        <label className="block">
          <span className="text-xs text-muted-foreground">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New Investment Plans Available!"
            className="mt-1 w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Message</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement here..."
            rows={4}
            className="mt-1 w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none text-sm resize-none"
          />
        </label>
        <button
          onClick={broadcast}
          disabled={loading || !title.trim() || !body.trim()}
          className="w-full py-3 rounded-xl gradient-sky text-primary-foreground font-bold glow-neon disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Megaphone className="h-4 w-4" />
          {loading ? "Sending..." : `Broadcast to ${totalUsers} users`}
        </button>
      </div>

      <div className="card-3d rounded-2xl p-5">
        <div className="font-semibold mb-3">Recent Announcements</div>
        <div className="space-y-2">
          {announcements.length === 0 && <div className="text-sm text-muted-foreground">No announcements yet.</div>}
          {announcements.map((a) => (
            <div key={a.id} className="border-b border-border last:border-0 py-3">
              <div className="font-semibold text-sm">{a.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.body}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{relTime(a.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
