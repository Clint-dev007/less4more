import { REFERRAL_LEVELS, VIP_LEVELS, type ReferralLevel, type VipLevel } from "@/lib/ranks";

export function ReferralBadge({ level, size = "sm" }: { level: ReferralLevel; size?: "xs" | "sm" | "md" }) {
  const info = REFERRAL_LEVELS[level];
  const sizes = {
    xs: "text-[9px] px-1.5 py-0.5 gap-0.5",
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1",
  };
  return (
    <span className={`inline-flex items-center rounded-full font-bold bg-secondary border border-border ${info.color} ${sizes[size]}`}>
      <span>{info.icon}</span>
      <span className="hidden sm:inline">{info.label}</span>
    </span>
  );
}

export function VipBadge({ level, size = "sm" }: { level: VipLevel; size?: "xs" | "sm" | "md" }) {
  if (level === "none") return null;
  const info = VIP_LEVELS[level];
  const sizes = {
    xs: "text-[9px] px-1.5 py-0.5 gap-0.5",
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1",
  };
  return (
    <span className={`inline-flex items-center rounded-full font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 ${sizes[size]}`}>
      <span>{info.icon}</span>
      <span className={`hidden sm:inline ${info.color}`}>{info.label}</span>
    </span>
  );
}

export function ReferralBadgeIcon({ level }: { level: ReferralLevel }) {
  const info = REFERRAL_LEVELS[level];
  return (
    <span className={`text-xs font-bold ${info.color}`} title={`${info.label} Referrer`}>
      {info.icon}
    </span>
  );
}

export function VipBadgeIcon({ level }: { level: VipLevel }) {
  if (level === "none") return null;
  const info = VIP_LEVELS[level];
  return (
    <span className={`text-xs font-bold ${info.color}`} title={info.label}>
      {info.icon}
    </span>
  );
}
