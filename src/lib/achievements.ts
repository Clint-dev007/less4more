export interface AchievementDef {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  first_investment: {
    key: "first_investment",
    label: "First Investment",
    description: "Made your first investment",
    icon: "\u{1F4B0}",
    color: "text-green-400",
    gradient: "from-green-500 to-emerald-600",
  },
  first_referral: {
    key: "first_referral",
    label: "First Referral",
    description: "Referred your first friend",
    icon: "\u{1F465}",
    color: "text-blue-400",
    gradient: "from-blue-500 to-indigo-600",
  },
  invested_100k: {
    key: "invested_100k",
    label: "\u20A6100K Invested",
    description: "Invested over \u20A6100,000",
    icon: "\u{1F4B5}",
    color: "text-yellow-400",
    gradient: "from-yellow-500 to-amber-600",
  },
  active_30_days: {
    key: "active_30_days",
    label: "30 Days Active",
    description: "Been active for 30 days",
    icon: "\u23F0",
    color: "text-purple-400",
    gradient: "from-purple-500 to-violet-600",
  },
  bronze_referrer: {
    key: "bronze_referrer",
    label: "Bronze Referrer",
    description: "Earned 1+ qualified referral",
    icon: "\u{1F949}",
    color: "text-amber-600",
    gradient: "from-amber-600 to-orange-700",
  },
  silver_referrer: {
    key: "silver_referrer",
    label: "Silver Referrer",
    description: "Earned 10+ qualified referrals",
    icon: "\u{1F948}",
    color: "text-gray-300",
    gradient: "from-gray-400 to-slate-500",
  },
  gold_referrer: {
    key: "gold_referrer",
    label: "Gold Referrer",
    description: "Earned 25+ qualified referrals",
    icon: "\u{1F947}",
    color: "text-yellow-400",
    gradient: "from-yellow-400 to-amber-500",
  },
  diamond_referrer: {
    key: "diamond_referrer",
    label: "Diamond Referrer",
    description: "Earned 50+ qualified referrals",
    icon: "\u{1F48E}",
    color: "text-cyan-300",
    gradient: "from-cyan-400 to-blue-500",
  },
  elite_ambassador: {
    key: "elite_ambassador",
    label: "Elite Ambassador",
    description: "Earned 100+ qualified referrals",
    icon: "\u{1F451}",
    color: "text-purple-400",
    gradient: "from-purple-500 to-pink-600",
  },
  vip1: {
    key: "vip1",
    label: "VIP 1",
    description: "Total invested over \u20A6100,000",
    icon: "\u2B50",
    color: "text-yellow-400",
    gradient: "from-yellow-500 to-amber-500",
  },
  vip2: {
    key: "vip2",
    label: "VIP 2",
    description: "Total invested over \u20A6500,000",
    icon: "\u2B50\u2B50",
    color: "text-yellow-400",
    gradient: "from-yellow-500 to-orange-500",
  },
  vip3: {
    key: "vip3",
    label: "VIP 3",
    description: "Total invested over \u20A61,000,000",
    icon: "\u2B50\u2B50\u2B50",
    color: "text-yellow-500",
    gradient: "from-amber-500 to-red-500",
  },
  vip4: {
    key: "vip4",
    label: "VIP 4",
    description: "Total invested over \u20A62,000,000",
    icon: "\u2B50\u2B50\u2B50\u2B50",
    color: "text-orange-500",
    gradient: "from-orange-500 to-red-600",
  },
  vip_elite_achievement: {
    key: "vip_elite_achievement",
    label: "VIP Elite",
    description: "Total invested over \u20A65,000,000",
    icon: "\u{1F451}",
    color: "text-purple-400",
    gradient: "from-purple-500 to-pink-600",
  },
};

export const ACHIEVEMENT_ORDER = [
  "first_investment",
  "first_referral",
  "invested_100k",
  "active_30_days",
  "bronze_referrer",
  "silver_referrer",
  "gold_referrer",
  "diamond_referrer",
  "elite_ambassador",
  "vip1",
  "vip2",
  "vip3",
  "vip4",
  "vip_elite_achievement",
];
