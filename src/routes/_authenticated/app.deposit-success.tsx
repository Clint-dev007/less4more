import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { verifyPaystack } from "@/lib/paystack.functions";
import { SuccessAnimation } from "@/components/success-animation";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/deposit/success")({
  component: DepositSuccess,
});

function DepositSuccess() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (!reference || !user) {
      setStatus("error");
      return;
    }

    (async () => {
      const result = await verifyPaystack({ data: { reference } });
      if (result.ok) {
        setStatus("success");
        setAmount(result.amount ?? 0);
      } else {
        setStatus("error");
        toast.error(result.message || "Verification failed");
      }
    })();
  }, [user]);

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => navigate({ to: "/app" }), 3000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  if (status === "loading") {
    return (
      <div className="px-4 pt-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-4">Verifying your payment...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-4 pt-6 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg font-bold text-destructive">Payment verification failed</p>
        <p className="text-sm text-muted-foreground mt-2">Please contact support if you were charged.</p>
        <button onClick={() => navigate({ to: "/app/deposit" })}
          className="mt-4 px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-bold">
          Back to Deposit
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 flex flex-col items-center justify-center min-h-[50vh]">
      <SuccessAnimation show={true} message={`₦${amount.toLocaleString()} deposited successfully!`} onDone={() => {}} />
    </div>
  );
}
