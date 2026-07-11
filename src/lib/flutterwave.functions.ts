import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initFlutterwave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { amount: number; email: string; name: string; phone?: string; redirect_url: string }) => data)
  .handler(async ({ data, context }) => {
    const amount = Number(data.amount);
    if (!amount || amount < 100) throw new Error("Amount must be at least ₦100");

    const secret = process.env.FLW_SECRET_KEY;
    if (!secret) throw new Error("Flutterwave not configured");

    const tx_ref = `L4M-${context.userId.slice(0, 8)}-${Date.now()}`;

    // Record pending deposit
    const { supabase } = context;
    const { error: dErr } = await supabase.from("deposits").insert({
      user_id: context.userId,
      amount,
      ref: tx_ref,
      provider: "flutterwave",
      flw_tx_ref: tx_ref,
      receipt_url: null,
    });
    if (dErr) throw new Error(dErr.message);

    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref,
        amount,
        currency: "NGN",
        redirect_url: data.redirect_url,
        customer: { email: data.email, name: data.name, phonenumber: data.phone ?? "" },
        customizations: { title: "less4more Wallet Top-up", description: "Deposit into your less4more wallet" },
        meta: { user_id: context.userId },
      }),
    });
    const json = await res.json() as { status?: string; message?: string; data?: { link?: string } };
    if (!res.ok || json.status !== "success" || !json.data?.link) {
      throw new Error(json.message || "Could not start payment");
    }
    return { link: json.data.link, tx_ref };
  });

export const verifyFlutterwave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tx_ref: string; transaction_id?: string }) => data)
  .handler(async ({ data }) => {
    const secret = process.env.FLW_SECRET_KEY;
    if (!secret) throw new Error("Flutterwave not configured");

    let verifyUrl: string;
    if (data.transaction_id) {
      verifyUrl = `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(data.transaction_id)}/verify`;
    } else {
      verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(data.tx_ref)}`;
    }
    const res = await fetch(verifyUrl, { headers: { Authorization: `Bearer ${secret}` } });
    const json = await res.json() as {
      status?: string;
      data?: { status?: string; amount?: number; tx_ref?: string; id?: number };
    };
    if (json.status !== "success" || json.data?.status !== "successful") {
      return { ok: false as const, message: "Payment not completed" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("credit_deposit_by_ref", {
      _tx_ref: json.data.tx_ref!,
      _tx_id: String(json.data.id ?? ""),
      _amount: Number(json.data.amount ?? 0),
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, amount: json.data.amount };
  });