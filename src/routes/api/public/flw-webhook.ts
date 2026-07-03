import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/flw-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hash = request.headers.get("verif-hash");
        const expected = process.env.FLW_WEBHOOK_HASH;
        if (!expected || hash !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const secret = process.env.FLW_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const body = await request.json() as {
          event?: string;
          data?: { id?: number; tx_ref?: string; status?: string; amount?: number };
        };
        const tx_ref = body.data?.tx_ref;
        const tx_id = body.data?.id;
        if (!tx_ref || !tx_id) return new Response("bad", { status: 400 });

        // Re-verify against Flutterwave (never trust webhook payload)
        const vr = await fetch(`https://api.flutterwave.com/v3/transactions/${tx_id}/verify`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const vj = await vr.json() as { status?: string; data?: { status?: string; amount?: number; tx_ref?: string; id?: number } };
        if (vj.status !== "success" || vj.data?.status !== "successful" || vj.data.tx_ref !== tx_ref) {
          return new Response("not verified", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("credit_deposit_by_ref", {
          _tx_ref: tx_ref,
          _tx_id: String(tx_id),
          _amount: Number(vj.data.amount ?? 0),
        });
        if (error) return new Response(error.message, { status: 500 });
        return new Response("ok");
      },
    },
  },
});