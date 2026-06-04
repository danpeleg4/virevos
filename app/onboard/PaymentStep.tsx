"use client";

import { useState } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { Shield, Info } from "lucide-react";
import type { PaymentStepProps } from "@/types/onboard";
import { createSubscription } from "@/lib/workspace/billing";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const planLabels: Record<string, { name: string; price: string }> = {
  professional: { name: "Professional", price: "$29.00" },
  business: { name: "Business", price: "$79.00" },
};

function CheckoutForm({ planId }: { planId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setError(null);
    setLoading(true);

    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        setError(submitResult.error.message ?? "Payment error");
        return;
      }

      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {},
      });

      if (result.error) {
        setError(result.error.message ?? "Payment confirmation failed");
        return;
      }

      const pmId =
        typeof result.setupIntent?.payment_method === "string"
          ? result.setupIntent.payment_method
          : (result.setupIntent?.payment_method?.id ?? null);

      if (!pmId) {
        setError("Could not retrieve payment method. Please try again.");
        return;
      }

      await createSubscription({
        planId: planId as "professional" | "business",
        paymentMethodId: pmId,
      });

      router.push("/workspace/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
          <Info className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      <PaymentElement options={{ layout: "tabs" }} />

      <div className="flex items-center space-x-2 text-[12px] text-gray-400 justify-center">
        <Shield size={14} className="text-green-500" />
        <span>Payments are secure and encrypted.</span>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!stripe || !elements || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[14px] font-bold shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : "Complete Checkout"}
      </Button>
    </div>
  );
}

export default function PaymentStep({ formData }: PaymentStepProps) {
  const {
    data: clientSecret,
    isLoading,
    isError,
  } = useQuery<string>({
    queryKey: ["setup-intent"],
    queryFn: () =>
      axios.get("/api/billing/setup-intent").then((r) => r.data.clientSecret),
    staleTime: Infinity,
  });

  const planInfo = planLabels[formData.selectedPlan ?? ""] ?? {
    name: "Professional",
    price: "$29.00",
  };

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[13px] text-gray-500">Selected Plan</span>
          <span className="text-[14px] font-bold text-gray-900">
            {planInfo.name}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[13px] text-gray-500">Billed Monthly</span>
          <span className="text-[14px] font-bold text-gray-900">
            {planInfo.price}
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm text-red-600 font-medium">
            Failed to load payment form. Please refresh and try again.
          </p>
        </div>
      )}

      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm planId={formData.selectedPlan ?? "professional"} />
        </Elements>
      )}
    </div>
  );
}
