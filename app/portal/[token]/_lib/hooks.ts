"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import type {
  BookingInput,
  PortalChatMessage,
  PortalData,
  TimeSlot,
} from "@/types/portal";
import type { DocumentRequestItem } from "@/types/document_requests";
import { sendPortalChatMessage } from "@/lib/portal_chat";
import { createPortalBooking } from "@/lib/portal_bookings";
import { uploadDocumentRequestItem } from "@/lib/portal_document_uploads";

export const portalQueryKey = (token: string) => ["portal", token] as const;
export const portalChatQueryKey = (token: string) =>
  ["portal-chat", token] as const;

/** Loads the main portal payload (client, cases, files, bookings, docs). */
export function usePortalData(token: string) {
  return useQuery<PortalData>({
    queryKey: portalQueryKey(token),
    queryFn: async () => {
      const res = await axios.get(`/api/portal/${token}`, {
        params: { type: "main" },
      });
      return res.data as PortalData;
    },
    enabled: !!token,
  });
}

/** Polls the chat thread and exposes an optimistic send mutation. */
export function usePortalChat(token: string) {
  const queryClient = useQueryClient();
  const queryKey = portalChatQueryKey(token);

  const query = useQuery<{ messages: PortalChatMessage[] }>({
    queryKey,
    queryFn: async () => {
      const res = await axios.get(`/api/portal/${token}`, {
        params: { type: "chat" },
      });
      return res.data;
    },
    enabled: !!token,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) => sendPortalChatMessage(token, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{
        messages: PortalChatMessage[];
      }>(queryKey);
      const optimistic: PortalChatMessage = {
        id: -Date.now(),
        senderType: "client",
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<{ messages: PortalChatMessage[] }>(
        queryKey,
        (old) => ({ messages: [...(old?.messages ?? []), optimistic] })
      );
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error("Failed to send message");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return { messages: query.data?.messages ?? [], sendMessage };
}

/** Fetches bookable time slots for a date/duration; disabled until a date is picked. */
export function useAvailableSlots(
  token: string,
  date: Date | undefined,
  duration: number
) {
  const dateStr = date ? date.toISOString().split("T")[0] : null;
  return useQuery<TimeSlot[]>({
    queryKey: ["portal-slots", token, dateStr, duration],
    queryFn: async () => {
      const res = await axios.get(`/api/portal/${token}`, {
        params: { type: "availability", date: dateStr, duration },
      });
      return (res.data.slots ?? []) as TimeSlot[];
    },
    enabled: !!token && !!dateStr,
  });
}

/** Uploads a generic case file, refreshing the portal payload on success. */
export function useFileUpload(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      caseId,
    }: {
      file: File;
      caseId: number | null;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (caseId) formData.append("caseId", String(caseId));
      const res = await axios.post(
        `/api/portal/${token}/files/upload`,
        formData
      );
      return res.data;
    },
    onError: (err: unknown) => {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Upload failed";
      toast.error(message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalQueryKey(token) });
    },
  });
}

interface DocumentAnalysis {
  verdict: DocumentRequestItem["aiVerdict"];
  reasoning: string;
}

/** Uploads a file against a document-checklist item, with AI-verdict toasts. */
export function useDocumentItemUpload(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, file }: { itemId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadDocumentRequestItem(token, itemId, formData);
      return {
        fileName: file.name,
        analysis: (res.analysis ?? null) as DocumentAnalysis | null,
      };
    },
    onSuccess: ({ fileName, analysis }) => {
      if (analysis?.verdict === "does_not_meet") {
        toast.error(
          analysis.reasoning || `${fileName} does not meet the requirement`
        );
      } else if (analysis?.verdict === "meets") {
        toast.success(`${fileName} looks good`);
      } else {
        toast.success(`${fileName} uploaded`);
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error && err.message ? err.message : "Upload failed";
      toast.error(message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: portalQueryKey(token) });
    },
  });
}

/** Books a pending meeting for the portal. */
export function useBookMeeting(token: string, onConfirmed: () => void) {
  return useMutation({
    mutationFn: (input: BookingInput) => createPortalBooking(token, input),
    onSuccess: () => onConfirmed(),
    onError: () => {
      toast.error("Failed to book meeting");
    },
  });
}
