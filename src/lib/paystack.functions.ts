import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initPaystack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { amount: number; email: string; name: string; callback_url: string }) => data)
  .handler(async ({ data, context }) => {
    const amount = Number(data.amount);
    if (!amount || amount < 100) throw new Error("Amount must be at least ₦100");

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const reference = `L4M-${context.userId.slice(0, 8)}-${Date.now()}`;

    const { supabase } = context;
    const { error: dErr } = await supabase.from("deposits").insert({
      user_id: context.userId,
      amount,
      ref: reference,
      provider: "paystack",
      psk_reference: reference,
      receipt_url: null,
    });
    if (dErr) throw new Error(dErr.message);

    const res = await fetch("https://api.paystack.co/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        amount: amount * 100,
        reference,
        callback_url: data.callback_url,
        metadata: {
          custom_fields: [
            { display_name: "User ID", variable_name: "user_id", value: context.userId },
          ],
        },
      }),
    });
    const json = await res.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
    if (!res.ok || !json.status || !json.data?.authorization_url) {
      throw new Error(json.message || "Could not start payment");
    }
    return { authorization_url: json.data.authorization_url, reference };
  });

export const verifyPaystack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reference: string }) => data)
  .handler(async ({ data }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("Paystack not configured");

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = await res.json() as {
      status?: boolean;
      data?: { status?: string; amount?: number; reference?: string; id?: number };
    };
    if (!json.status || json.data?.status !== "success") {
      return { ok: false as const, message: "Payment not completed" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("credit_deposit_by_psk_ref", {
      _psk_reference: json.data.reference!,
      _psk_tx_id: String(json.data.id ?? ""),
      _amount: Number(json.data.amount ?? 0) / 100,
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, amount: Number(json.data.amount ?? 0) / 100 };
  });
