export type ReferralLevel = "bronze" | "silver" | "gold" | "diamond" | "elite";
export type VipLevel = "none" | "vip1" | "vip2" | "vip3" | "vip4" | "vip_elite";

export const REFERRAL_LEVELS: Record<ReferralLevel, { label: string; icon: string; color: string; min: number }> = {
  bronze: { label: "Bronze", icon: "\u{1F949}", color: "text-amber-600", min: 0 },
  silver: { label: "Silver", icon: "\u{1F948}", color: "text-gray-400", min: 10 },
  gold: { label: "Gold", icon: "\u{1F947}", color: "text-yellow-500", min: 25 },
  diamond: { label: "Diamond", icon: "\u{1F48E}", color: "text-cyan-400", min: 50 },
  elite: { label: "Elite Ambassador", icon: "\u{1F451}", color: "text-purple-500", min: 100 },
};

export const VIP_LEVELS: Record<VipLevel, { label: string; icon: string; color: string; threshold: number }> = {
  none: { label: "Member", icon: "", color: "text-muted-foreground", threshold: 0 },
  vip1: { label: "VIP 1", icon: "\u2B50", color: "text-yellow-400", threshold: 100000 },
  vip2: { label: "VIP 2", icon: "\u2B50\u2B50", color: "text-yellow-400", threshold: 500000 },
  vip3: { label: "VIP 3", icon: "\u2B50\u2B50\u2B50", color: "text-yellow-500", threshold: 1000000 },
  vip4: { label: "VIP 4", icon: "\u2B50\u2B50\u2B50\u2B50", color: "text-orange-500", threshold: 2000000 },
  vip_elite: { label: "VIP Elite", icon: "\u{1F451}", color: "text-purple-500", threshold: 5000000 },
};

export function getReferralLevel(count: number): ReferralLevel {
  if (count >= 100) return "elite";
  if (count >= 50) return "diamond";
  if (count >= 25) return "gold";
  if (count >= 10) return "silver";
  return "bronze";
}

export function getVipLevel(totalInvested: number): VipLevel {
  if (totalInvested >= 5000000) return "vip_elite";
  if (totalInvested >= 2000000) return "vip4";
  if (totalInvested >= 1000000) return "vip3";
  if (totalInvested >= 500000) return "vip2";
  if (totalInvested >= 100000) return "vip1";
  return "none";
}

export function getNextReferralThreshold(level: ReferralLevel): number {
  const order: ReferralLevel[] = ["bronze", "silver", "gold", "diamond", "elite"];
  const idx = order.indexOf(level);
  if (idx >= order.length - 1) return Infinity;
  return REFERRAL_LEVELS[order[idx + 1]].min;
}

export function getNextVipThreshold(level: VipLevel): number {
  const order: VipLevel[] = ["none", "vip1", "vip2", "vip3", "vip4", "vip_elite"];
  const idx = order.indexOf(level);
  if (idx >= order.length - 1) return Infinity;
  return VIP_LEVELS[order[idx + 1]].threshold;
}
