import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn, shortDate } from "@/lib/format";
import { getReferralLevel, getVipLevel, type ReferralLevel, type VipLevel } from "@/lib/ranks";
import { ReferralBadge, VipBadge } from "@/components/badges";
import { AchievementGrid, useAchievements } from "@/components/achievements";
import { Calendar, Hash, TrendingUp, Users, Award, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/profile")({ component: Profile });

function Profile() {
  const { profile, user } = useAuth();
  const earned = useAchievements();
  const [refCount, setRefCount] = useState(0);
  const [totalInv, setTotalInv] = useState(0);
  const [myLevel, setMyLevel] = useState<ReferralLevel>("bronze");
  const [myVip, setMyVip] = useState<VipLevel>("none");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [refs, inv] = await Promise.all([
        supabase.from("referrals").select("id, bonus_paid").eq("referrer_id", user.id),
        supabase.from("investments").select("amount").eq("user_id", user.id),
      ]);
      const qualified = (refs.data ?? []).filter((r) => r.bonus_paid > 0).length;
      const total = (inv.data ?? []).reduce((s, i) => s + Number(i.amount), 0);
      setRefCount(qualified);
      setTotalInv(total);
      setMyLevel(getReferralLevel(qualified));
      setMyVip(getVipLevel(total));
    };
    load();
  }, [user]);

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      {/* Profile Header */}
      <div className="card-3d rounded-3xl p-6 text-center">
        <div className="h-20 w-20 rounded-full gradient-primary grid place-items-center text-3xl font-bold text-primary-foreground mx-auto glow-primary">
          {(profile?.name || "U")[0].toUpperCase()}
        </div>
        <h1 className="text-xl font-bold mt-3">{profile?.name || "User"}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <ReferralBadge level={myLevel} size="sm" />
          {myVip !== "none" && <VipBadge level={myVip} size="sm" />}
        </div>
        <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
          <Calendar className="h-3 w-3" /> Joined {profile?.joined_at ? shortDate(profile.joined_at) : "N/A"}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-3d rounded-2xl p-4 text-center">
          <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-xl font-bold">{ngn(totalInv)}</div>
          <div className="text-[10px] text-muted-foreground">Total Invested</div>
        </div>
        <div className="card-3d rounded-2xl p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-xl font-bold">{refCount}</div>
          <div className="text-[10px] text-muted-foreground">Qualified Referrals</div>
        </div>
      </div>

      {/* Referral Code */}
      <div className="card-3d rounded-2xl p-4">
        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Hash className="h-3 w-3" /> Referral Code</div>
        <div className="text-lg font-mono font-bold text-primary">{profile?.ref_code}</div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 text-gold" />
          <span className="text-sm font-semibold">Achievements ({earned.size})</span>
        </div>
        <AchievementGrid earned={earned} />
      </div>

      <Link to="/app/notification-settings" className="block card-3d rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">Notification Settings</div>
            <div className="text-xs text-muted-foreground">Manage push, sound, and vibration</div>
          </div>
        </div>
      </Link>
    </div>
  );
}
