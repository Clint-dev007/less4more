import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn } from "@/lib/format";
import { ReferralBadge, VipBadge } from "@/components/badges";
import { getReferralLevel, getVipLevel, type ReferralLevel, type VipLevel } from "@/lib/ranks";
import { Trophy, Users, Gift, TrendingUp, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/leaderboard")({ component: Leaderboard });

type LeaderboardEntry = {
  id: string;
  name: string;
  ref_code: string;
  invested: number;
  avatar_url: string | null;
  referral_count: number;
  referral_level: ReferralLevel;
  vip_level: VipLevel;
};

function Leaderboard() {
  const { user } = useAuth();
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [refs, setRefs] = useState({ count: 0, bonus: 0 });
  const [myRank, setMyRank] = useState<number>(0);
  const [myLevel, setMyLevel] = useState<ReferralLevel>("bronze");
  const [myVip, setMyVip] = useState<VipLevel>("none");
  const [tab, setTab] = useState<"invested" | "referrals">("invested");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_enhanced_leaderboard", { _limit: 50 });
      if (data) {
        const entries = data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          name: e.name as string,
          ref_code: e.ref_code as string,
          invested: Number(e.invested),
          avatar_url: e.avatar_url as string | null,
          referral_count: Number(e.referral_count),
          referral_level: (e.referral_level as ReferralLevel) || "bronze",
          vip_level: (e.vip_level as VipLevel) || "none",
        }));
        setTop(entries);

        const idx = entries.findIndex((e) => e.id === user?.id);
        if (idx >= 0) setMyRank(idx + 1);

        const my = entries.find((e) => e.id === user?.id);
        if (my) {
          setMyLevel(my.referral_level);
          setMyVip(my.vip_level);
        }
      }
    };

    if (user) {
      supabase.from("referrals").select("bonus_paid").eq("referrer_id", user.id).then(({ data }) => {
        const arr = data ?? [];
        setRefs({ count: arr.length, bonus: arr.reduce((s, r) => s + Number(r.bonus_paid), 0) });
      });
    }

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const sorted = tab === "referrals"
    ? [...top].sort((a, b) => b.referral_count - a.referral_count)
    : [...top].sort((a, b) => b.invested - a.invested);

  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="text-gold" /> Leaderboard
      </h1>

      {/* My Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-3d rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Friends joined
          </div>
          <div className="text-2xl font-bold mt-1">{refs.count}</div>
          <div className="mt-1"><ReferralBadge level={myLevel} size="xs" /></div>
        </div>
        <div className="card-3d rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gift className="h-3.5 w-3.5 text-gold" /> Bonus earned
          </div>
          <div className="text-2xl font-bold mt-1">{ngn(refs.bonus)}</div>
          {myVip !== "none" && <div className="mt-1"><VipBadge level={myVip} size="xs" /></div>}
        </div>
      </div>

      {myRank > 0 && (
        <div className="card-neon rounded-2xl p-3 flex items-center gap-3">
          <Crown className="h-5 w-5 text-gold" />
          <div className="text-sm font-semibold">Your rank: #{myRank}</div>
          <div className="ml-auto flex gap-1">
            <ReferralBadge level={myLevel} size="xs" />
            {myVip !== "none" && <VipBadge level={myVip} size="xs" />}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("invested")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "invested" ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5 inline mr-1" /> By Investment
        </button>
        <button
          onClick={() => setTab("referrals")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "referrals" ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5 inline mr-1" /> By Referrals
        </button>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 card-3d rounded-2xl">No data yet</div>
        )}
        {sorted.map((u, i) => (
          <div
            key={u.id}
            className={`rounded-2xl px-4 py-3 flex items-center gap-3 transition-all ${
              u.id === user?.id ? "card-neon" : "card-3d"
            } ${i < 3 ? "ring-1 ring-gold/30" : ""}`}
          >
            <div className={`h-9 w-9 rounded-full grid place-items-center font-bold text-sm shrink-0 ${
              i === 0 ? "gradient-gold text-gold-foreground glow-gold" :
              i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white" :
              i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
              "bg-secondary text-muted-foreground"
            }`}>
              {i < 3 ? medals[i] : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate text-sm">{u.name || "Anonymous"}</span>
                <ReferralBadge level={u.referral_level} size="xs" />
                {u.vip_level !== "none" && <VipBadge level={u.vip_level} size="xs" />}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {tab === "invested" ? ngn(u.invested) : `${u.referral_count} referrals`}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold text-sm">{tab === "invested" ? ngn(u.invested) : u.referral_count}</div>
              <div className="text-[10px] text-muted-foreground">{tab === "invested" ? "invested" : "refs"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
