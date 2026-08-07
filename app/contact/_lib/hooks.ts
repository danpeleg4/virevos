"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export interface DemoRequestFormValues {
  name: string;
  email: string;
  company: string;
  message: string;
  honeypot: string;
}

/** Submits a demo-request from the public contact form. */
export function useSubmitDemoRequest() {
  return useMutation({
    mutationFn: async (payload: DemoRequestFormValues) => {
      const res = await axios.post("/api/demo-requests", payload);
      return res.data as { success: true; id: number };
    },
  });
}
