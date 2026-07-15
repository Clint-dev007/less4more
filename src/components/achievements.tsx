import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ACHIEVEMENTS, ACHIEVEMENT_ORDER } from "@/lib/achievements";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function useAchievements() {
  const { user } = useAuth();
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.rpc("get_user_achievements", { _user_id: user.id });
      if (data) setEarned(new Set(data.map((a: { achievement_key: string }) => a.achievement_key)));
    };
    load();
  }, [user]);

  return earned;
}

export function AchievementPopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-28 right-4 z-[70] card-3d rounded-2xl p-4 max-w-xs shadow-2xl"
        >
          <button onClick={onClose} className="absolute top-2 right-2 p-1 rounded-full bg-secondary">
            <X className="h-3 w-3" />
          </button>
          <div className="text-center">
            <div className="text-3xl mb-1">🎉</div>
            <div className="text-sm font-bold">Achievement Unlocked!</div>
            <div className="text-xs text-muted-foreground mt-0.5">Check your profile for details</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AchievementGrid({ earned }: { earned: Set<string> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ACHIEVEMENT_ORDER.map((key) => {
        const def = ACHIEVEMENTS[key];
        if (!def) return null;
        const isEarned = earned.has(key);
        return (
          <div
            key={key}
            className={`rounded-2xl p-3 text-center transition-all ${
              isEarned
                ? `bg-gradient-to-br ${def.gradient} text-white shadow-lg`
                : "bg-secondary opacity-40 grayscale"
            }`}
          >
            <div className="text-2xl mb-1">{def.icon}</div>
            <div className="text-[10px] font-bold leading-tight">{def.label}</div>
          </div>
        );
      })}
    </div>
  );
}
