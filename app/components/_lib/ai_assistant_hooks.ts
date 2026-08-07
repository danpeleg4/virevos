"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  DocumentRequestItemInput,
  PendingDocRequest,
} from "@/types/document_requests";

export const pendingDocumentRequestsQueryKey = [
  "documentRequests",
  "pending",
] as const;

/** Accepts a pending portal meeting booking (AI assistant panel). */
export function useAcceptPortalBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number) => {
      await axios.patch(`/api/portal-bookings/${bookingId}`, {
        type: "accept",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
    },
  });
}

/** Declines a pending portal meeting booking (AI assistant panel). */
export function useDenyPortalBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number) => {
      await axios.patch(`/api/portal-bookings/${bookingId}`, {
        type: "status",
        data: { status: "cancelled" },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
    },
  });
}

/** Document requests awaiting client review, shown in the AI assistant panel. */
export function usePendingDocumentRequests(enabled: boolean) {
  return useQuery<PendingDocRequest[]>({
    queryKey: pendingDocumentRequestsQueryKey,
    queryFn: async () => {
      const res = await axios.get<PendingDocRequest[]>(
        "/api/document-requests/pending"
      );
      return res.data;
    },
    enabled,
  });
}

/** Updates a document request's client link or checklist items. */
export function useUpdateDocumentRequest(requestId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      clientId?: number | null;
      items?: DocumentRequestItemInput[];
    }) => {
      await axios.patch(`/api/document-requests/${requestId}`, {
        type: "update",
        data: patch,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pendingDocumentRequestsQueryKey,
      });
    },
  });
}

/** Approves a document request, sending it to the client. */
export function useApproveDocumentRequest(requestId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.patch(`/api/document-requests/${requestId}`, {
        type: "approve",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pendingDocumentRequestsQueryKey,
      });
    },
  });
}

/** Declines a document request. */
export function useDeclineDocumentRequest(requestId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.patch(`/api/document-requests/${requestId}`, {
        type: "decline",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pendingDocumentRequestsQueryKey,
      });
    },
  });
}
