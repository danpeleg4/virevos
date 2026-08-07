"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export const billingQueryKey = ["billing"] as const;

/** The account's billing overview: subscription, payment method, usage, invoices. */
export function useBillingOverview() {
  return useQuery<BillingOverview>({
    queryKey: billingQueryKey,
    queryFn: () => axios.get("/api/billing").then((r) => r.data),
  });
}

/** Stripe SetupIntent client secret for the update-payment-method form. */
export function useBillingSetupIntent(enabled: boolean) {
  return useQuery<string>({
    queryKey: ["setup-intent-billing"],
    queryFn: () =>
      axios.get("/api/billing/setup-intent").then((r) => r.data.clientSecret),
    enabled,
    staleTime: Infinity,
  });
}

export function useBilling({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pmId: string) => {
      await axios.post("/api/billing", {
        type: "update-payment-method",
        data: { paymentMethodId: pmId },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKey });
      onSuccess();
    },
  });
}

/** Changes the subscription plan. */
export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: PlanId) => {
      await axios.post("/api/billing", {
        type: "change-plan",
        data: { planId },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKey });
    },
  });
}

/** Cancels the subscription at the end of the current billing period. */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.post("/api/billing", { type: "cancel" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKey });
    },
  });
}

/** Reactivates a subscription that was set to cancel at period end. */
export function useResubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.post("/api/billing", { type: "resubscribe" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billingQueryKey });
    },
  });
}
