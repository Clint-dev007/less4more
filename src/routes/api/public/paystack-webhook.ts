import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 500 });

        const signature = request.headers.get("x-paystack-signature");
        if (!signature) return new Response("Unauthorized", { status: 401 });

        const body = await request.text();
        const expectedHash = crypto.createHmac("sha512", secret).update(body).digest("hex");
        if (signature !== expectedHash) {
          return new Response("Unauthorized", { status: 401 });
        }

        const payload = JSON.parse(body) as {
          event?: string;
          data?: { reference?: string; id?: number; amount?: number; status?: string };
        };

        if (payload.event !== "charge.success") {
          return new Response("Ignored", { status: 200 });
        }

        const reference = payload.data?.reference;
        const tx_id = payload.data?.id;
        if (!reference || !tx_id) return new Response("Bad request", { status: 400 });

        const vr = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const vj = await vr.json() as {
          status?: boolean;
          data?: { status?: string; amount?: number; reference?: string; id?: number };
        };
        if (!vj.status || vj.data?.status !== "success" || vj.data.reference !== reference) {
          return new Response("Not verified", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("credit_deposit_by_psk_ref", {
          _psk_reference: reference,
          _psk_tx_id: String(tx_id),
          _amount: Number(vj.data.amount ?? 0) / 100,
        });
        if (error) return new Response(error.message, { status: 500 });
        return new Response("OK");
      },
    },
  },
});
