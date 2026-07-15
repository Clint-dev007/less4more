import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { relTime } from "@/lib/format";
import { ReferralBadge, VipBadge } from "@/components/badges";
import { getReferralLevel, getVipLevel, type ReferralLevel, type VipLevel } from "@/lib/ranks";
import { Send, Reply, Smile, Pin, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/chat")({ component: GroupChat });

type ChatUser = { name: string; referral_level: ReferralLevel; vip_level: VipLevel; online_at: string | null; avatar_url: string | null };
type ChatMessage = {
  id: string; user_id: string; content: string; reply_to: string | null;
  is_pinned: boolean; is_deleted: boolean; created_at: string;
  profiles?: ChatUser;
  reply_content?: string;
  reply_user_name?: string;
  reactions?: Array<{ emoji: string; count: number; user_reacted: boolean }>;
};

const EMOJI_LIST = ["👍", "❤️", "😂", "🎉", "🔥", "💰", "🚀", "💎"];

function GroupChat() {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const [pinned, setPinned] = useState<ChatMessage | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("group_chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);

    if (!data) return;

    const userIds = [...new Set(data.map((m) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const messageIds = data.map((m) => m.id);
    const userIds = [...new Set(data.map((m) => m.user_id))];

    const [allReactions, allInvestments] = await Promise.all([
      supabase.from("group_chat_reactions").select("message_id, emoji, user_id").in("message_id", messageIds),
      supabase.from("investments").select("user_id, amount").in("user_id", userIds),
    ]);

    const reactionsByMsg = new Map<string, Array<{ emoji: string; user_id: string }>>();
    (allReactions.data ?? []).forEach((r) => {
      const arr = reactionsByMsg.get(r.message_id) || [];
      arr.push(r);
      reactionsByMsg.set(r.message_id, arr);
    });

    const invByUser = new Map<string, number>();
    (allInvestments.data ?? []).forEach((i) => {
      invByUser.set(i.user_id, (invByUser.get(i.user_id) || 0) + Number(i.amount));
    });

    const { data: refData } = await supabase
      .from("referrals")
      .select("referrer_id")
      .gt("bonus_paid", 0)
      .in("referrer_id", userIds);

    const refCounts = new Map<string, number>();
    (refData ?? []).forEach((r) => {
      refCounts.set(r.referrer_id, (refCounts.get(r.referrer_id) || 0) + 1);
    });

    const enriched = data.map((m) => {
      const p = profileMap.get(m.user_id);
      let reply_content: string | undefined;
      let reply_user_name: string | undefined;

      if (m.reply_to) {
        const replyMsg = data.find((r) => r.id === m.reply_to);
        if (replyMsg) {
          reply_content = replyMsg.content;
          reply_user_name = profileMap.get(replyMsg.user_id)?.name;
        }
      }

      const msgReactions = reactionsByMsg.get(m.id) || [];
      const reactionMap = new Map<string, { count: number; userIds: string[] }>();
      msgReactions.forEach((r) => {
        const existing = reactionMap.get(r.emoji) || { count: 0, userIds: [] };
        existing.count++;
        existing.userIds.push(r.user_id);
        reactionMap.set(r.emoji, existing);
      });

      const reactionsArr = Array.from(reactionMap.entries()).map(([emoji, { count, userIds: uids }]) => ({
        emoji,
        count,
        user_reacted: uids.includes(user?.id ?? ""),
      }));

      const totalInv = invByUser.get(m.user_id) || 0;
      const refCount = refCounts.get(m.user_id) || 0;

      return {
        ...m,
        profiles: {
          name: p?.name || "Anonymous",
          avatar_url: p?.avatar_url || null,
          referral_level: getReferralLevel(refCount),
          vip_level: getVipLevel(totalInv),
          online_at: null,
        } as ChatUser,
        reply_content,
        reply_user_name,
        reactions: reactionsArr,
      };
    });

    setMessages(enriched as ChatMessage[]);

    const pin = enriched.find((m) => m.is_pinned);
    setPinned(pin as ChatMessage | undefined ?? null);
  }, [user]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel("group-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_chat_messages" }, () => {
        loadMessages();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_chat_reactions" }, () => {
        loadMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadMessages]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      await supabase.from("profiles").update({ online_at: new Date().toISOString() }).eq("id", user.id);
      const { data } = await supabase.rpc("get_online_users", { _seconds: 300 });
      if (data) setOnlineUsers(new Set(data.map((o: { user_id: string }) => o.user_id)));
    }, 30000);

    supabase.from("profiles").update({ online_at: new Date().toISOString() }).eq("id", user.id);
    supabase.rpc("get_online_users", { _seconds: 300 }).then(({ data }) => {
      if (data) setOnlineUsers(new Set(data.map((o: { user_id: string }) => o.user_id)));
    });

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  async function send() {
    if (!input.trim() || !user) return;
    const content = input.trim();
    setInput("");
    setReplyTo(null);

    const { error } = await supabase.from("group_chat_messages").insert({
      user_id: user.id,
      content,
      reply_to: replyTo?.id || null,
    });

    if (error) {
      toast.error("Failed to send message");
    }
  }

  async function addReaction(messageId: string, emoji: string) {
    if (!user) return;
    setShowEmoji(null);

    const existing = messages
      .find((m) => m.id === messageId)
      ?.reactions?.find((r) => r.emoji === emoji && r.user_reacted);

    if (existing) {
      await supabase.from("group_chat_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("group_chat_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
  }

  async function deleteMessage(id: string) {
    await supabase.from("group_chat_messages").update({ is_deleted: true, content: "Message deleted" }).eq("id", id);
    setShowEmoji(null);
  }

  async function togglePin(id: string, currentPinned: boolean) {
    if (!isAdmin) return;
    if (currentPinned) {
      await supabase.from("group_chat_messages").update({ is_pinned: false }).eq("id", id);
    } else {
      await supabase.from("group_chat_messages").update({ is_pinned: true }).eq("id", id);
    }
    setShowEmoji(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {pinned && (
        <div className="px-4 py-2 bg-primary/10 border-b border-border flex items-center gap-2">
          <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium truncate">{pinned.content}</span>
          {isAdmin && (
            <button onClick={() => togglePin(pinned.id, true)} className="ml-auto shrink-0">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => {
          const isMe = m.user_id === user?.id;
          const isOnline = onlineUsers.has(m.user_id);

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
            >
              <div className="shrink-0 relative">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-xs font-bold text-primary-foreground">
                  {(m.profiles?.name || "A")[0].toUpperCase()}
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>

              <div className={`flex-1 min-w-0 ${isMe ? "text-right" : ""}`}>
                <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? "justify-end" : ""}`}>
                  <span className="text-xs font-bold truncate max-w-[120px]">{m.profiles?.name}</span>
                  {m.profiles && <ReferralBadge level={m.profiles.referral_level} size="xs" />}
                  {m.profiles && m.profiles.vip_level !== "none" && <VipBadge level={m.profiles.vip_level} size="xs" />}
                  <span className="text-[10px] text-muted-foreground">{relTime(m.created_at)}</span>
                </div>

                {m.reply_content && (
                  <div className={`text-[10px] text-muted-foreground bg-secondary/50 rounded-lg px-2 py-1 mb-1 ${isMe ? "ml-auto" : "mr-auto"} max-w-[200px] truncate`}>
                    <span className="font-semibold">{m.reply_user_name}</span>: {m.reply_content}
                  </div>
                )}

                <div className={`relative group inline-block max-w-[80%] ${isMe ? "ml-auto" : ""}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      m.is_deleted
                        ? "bg-secondary text-muted-foreground italic"
                        : isMe
                          ? "gradient-primary text-primary-foreground"
                          : "card-3d"
                    }`}
                  >
                    {m.content}
                  </div>

                  {!m.is_deleted && (
                    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${isMe ? "-left-16" : "-right-16"}`}>
                      <button onClick={() => setReplyTo(m)} className="p-1 rounded-full bg-secondary hover:bg-accent">
                        <Reply className="h-3 w-3" />
                      </button>
                      <button onClick={() => setShowEmoji(showEmoji === m.id ? null : m.id)} className="p-1 rounded-full bg-secondary hover:bg-accent">
                        <Smile className="h-3 w-3" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => togglePin(m.id, m.is_pinned)} className="p-1 rounded-full bg-secondary hover:bg-accent">
                          <Pin className="h-3 w-3" />
                        </button>
                      )}
                      {(isMe || isAdmin) && (
                        <button onClick={() => deleteMessage(m.id)} className="p-1 rounded-full bg-secondary hover:bg-destructive/20">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {showEmoji === m.id && (
                  <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : ""}`}>
                    {EMOJI_LIST.map((e) => (
                      <button key={e} onClick={() => addReaction(m.id, e)}
                        className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
                    ))}
                  </div>
                )}

                {m.reactions && m.reactions.length > 0 && (
                  <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : ""}`}>
                    {m.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        onClick={() => addReaction(m.id, r.emoji)}
                        className={`text-xs px-1.5 py-0.5 rounded-full border ${
                          r.user_reacted ? "bg-primary/20 border-primary" : "bg-secondary border-border"
                        }`}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-secondary border-t border-border overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-primary">{replyTo.profiles?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{replyTo.content}</div>
              </div>
              <button onClick={() => setReplyTo(null)} className="shrink-0 p-1">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 py-3 border-t border-border bg-background">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-secondary border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none max-h-24"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="p-3 rounded-full gradient-primary text-primary-foreground disabled:opacity-40 glow-primary shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
