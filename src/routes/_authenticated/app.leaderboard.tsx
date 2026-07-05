import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ngn } from "@/lib/format";
import { Trophy, Users, Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/leaderboard")({
  component: LB,
});

function LB() {
  const { user } = useAuth();
  const [top, setTop] = useState<Array<{ id: string; name: string; invested: number; ref_code: string }>>([]);
  const [refs, setRefs] = useState<{ count: number; bonus: number }>({ count: 0, bonus: 0 });

  useEffect(() => {
    supabase.rpc("get_leaderboard", { _limit: 20 })
      .then(({ data }) => setTop((data ?? []) as never));
    if (user) {
      supabase.from("referrals").select("bonus_paid").eq("referrer_id", user.id)
        .then(({ data }) => {
          const arr = data ?? [];
          setRefs({ count: arr.length, bonus: arr.reduce((s, r) => s + Number(r.bonus_paid), 0) });
        });
    }
  }, [user]);

  return (
    <div className="px-4 pt-6 space-y-5">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-gold" /> Leaderboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-3d rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Friends joined</div>
          <div className="text-2xl font-bold mt-1">{refs.count}</div>
        </div>
        <div className="card-3d rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Gift className="h-3.5 w-3.5 text-gold" /> Bonus earned</div>
          <div className="text-2xl font-bold mt-1">{ngn(refs.bonus)}</div>
        </div>
      </div>

      <div className="space-y-2">
        {top.map((u, i) => (
          <div key={u.id} className={`card-3d rounded-2xl px-4 py-3 flex items-center gap-3 ${u.id === user?.id ? "card-neon" : ""}`}>
            <div className={`h-9 w-9 rounded-full grid place-items-center font-bold text-sm ${
              i === 0 ? "gradient-gold text-gold-foreground glow-gold" :
              i === 1 ? "bg-secondary" :
              i === 2 ? "bg-secondary" : "bg-secondary text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{u.name || "Anonymous"}</div>
              <div className="text-[11px] text-muted-foreground font-mono">{u.ref_code}</div>
            </div>
            <div className="font-bold">{ngn(u.invested)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
