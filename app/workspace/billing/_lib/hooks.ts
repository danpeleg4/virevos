"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

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
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
      onSuccess();
    },
  });
}
