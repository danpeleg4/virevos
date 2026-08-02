"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  BookingInput,
  PortalChatMessage,
  PortalData,
  TimeSlot,
} from "@/types/portal";
import type { DocumentRequestItem } from "@/types/document_requests";
import { toast } from "@/app/components/ui/toast-store";

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
    mutationFn: async (body: string) => {
      const res = await axios.post(`/api/portal/${token}/chat`, {
        message: body,
      });
      return res.data as PortalChatMessage;
    },
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
      toast.error({
        title: "Failed",
        description: "Message failed to send",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
    onSettled: async () => {
      toast.success({
        title: "Sent",
        description: "Message sent successfully",
      });
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
      const res = await axios.post(`/api/portal/${token}/files`, formData);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: portalQueryKey(token) });
    },
    onSettled: async () => {
      toast.success({
        title: "Uploaded",
        description: "File uploaded successfully",
      });
    },
    onError: async () => {
      toast.error({
        title: "Failed",
        description: "File upload failed",
      });
    },
  });
}

interface DocumentAnalysis {
  verdict: DocumentRequestItem["aiVerdict"];
  reasoning: string;
}

/** Uploads a file against a document-checklist item. */
export function useDocumentItemUpload(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, file }: { itemId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        `/api/portal/${token}/document-requests/${itemId}/upload`,
        formData
      );
      return {
        fileName: file.name,
        analysis: (res.data.analysis ?? null) as DocumentAnalysis | null,
      };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: portalQueryKey(token) });
      toast.success({
        title: "Uploaded",
        description: "File uploaded successfully",
      });
    },
    onError: async () => {
      toast.error({
        title: "Failed",
        description: "File upload failed",
      });
    },
  });
}

/** Books a pending meeting for the portal. */
export function useBookMeeting(token: string, onConfirmed: () => void) {
  return useMutation({
    mutationFn: async (input: BookingInput) => {
      const res = await axios.post(`/api/portal/${token}/bookings`, input);
      return res.data;
    },
    onSuccess: () => {
      onConfirmed();
      toast.success({
        title: "Booked",
        description: "Meeting booked successfully",
      });
    },
    onError: async () => {
      toast.error({
        title: "Failed",
        description: "Meeting booking failed",
      });
    },
  });
}
