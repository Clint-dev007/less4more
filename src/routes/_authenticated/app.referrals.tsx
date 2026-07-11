import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn, shortDate } from "@/lib/format";
import { toast } from "sonner";
import { Copy, Share2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/referrals")({
  component: Refs,
});

function Refs() {
  const { profile, user } = useAuth();
  const [list, setList] = useState<Array<{ id: string; bonus_paid: number; created_at: string }>>([]);
  const [qualified, setQualified] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      supabase.from("referrals").select("id, bonus_paid, created_at").eq("referrer_id", user.id).order("created_at", { ascending: false })
        .then(({ data }) => setList((data ?? []) as never));
      supabase.rpc("count_qualified_referrals", { _user_id: user.id })
        .then(({ data }) => setQualified(Number(data ?? 0)));
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user]);

  const total = list.reduce((s, r) => s + Number(r.bonus_paid), 0);
  const canWithdraw = qualified >= 2;
  const remaining = Math.max(0, 2 - qualified);

  function copyCode() {
    navigator.clipboard.writeText(profile?.ref_code ?? "");
    toast.success("Code copied");
  }
  function share() {
    const url = `${window.location.origin}/auth?ref=${profile?.ref_code}`;
    if (navigator.share) navigator.share({ title: "less4more", text: "Invest with me on less4more!", url });
    else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Refer & earn</h1>

      <div className="rounded-3xl gradient-gold glow-gold p-5 text-gold-foreground">
        <div className="text-xs font-semibold opacity-80">Your referral code</div>
        <div className="text-4xl font-bold font-mono tracking-wider mt-1">{profile?.ref_code}</div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={copyCode} className="bg-black/15 hover:bg-black/20 rounded-2xl py-2.5 font-semibold flex items-center justify-center gap-1.5 text-sm">
            <Copy className="h-4 w-4" /> Copy code
          </button>
          <button onClick={share} className="bg-black/15 hover:bg-black/20 rounded-2xl py-2.5 font-semibold flex items-center justify-center gap-1.5 text-sm">
            <Share2 className="h-4 w-4" /> Share link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-3d rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Friends joined</div>
          <div className="text-2xl font-bold mt-1">{list.length}</div>
        </div>
        <div className="card-3d rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Bonus earned</div>
          <div className="text-2xl font-bold mt-1">{ngn(total)}</div>
        </div>
      </div>

      <div className={`card-3d rounded-2xl p-4 ${canWithdraw ? "" : "border border-gold/40"}`}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Withdrawal unlock progress</div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${canWithdraw ? "bg-primary/15 text-primary" : "bg-gold/15 text-gold"}`}>
            {canWithdraw ? "Unlocked" : `${remaining} more to go`}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          You need 2 referrals who have invested in any plan.
        </div>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full gradient-gold transition-all" style={{ width: `${Math.min(100, (qualified / 2) * 100)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Qualified (invested) referrals</span>
          <span className="font-bold">{qualified}/2</span>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">How it works</div>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
          <li>Share your code with friends.</li>
          <li>They sign up using your code.</li>
          <li>You earn 10% of their first investment, instantly.</li>
          <li>Once 2 friends have invested, your withdrawals unlock.</li>
        </ol>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Your referrals</div>
        <div className="space-y-2">
          {list.length === 0 && <div className="text-sm text-muted-foreground text-center py-6 card-3d rounded-2xl">No referrals yet.</div>}
          {list.map((r) => (
            <div key={r.id} className="card-3d rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Joined {shortDate(r.created_at)}</div>
              <div className="font-bold text-gold">+{ngn(r.bonus_paid)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
