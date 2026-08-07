"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { PortalChatMessage } from "@/types/portal";
import type { ScheduledEmail } from "@/types/communications";
import { type ScheduleEmailInput } from "@/lib/scheduled_emails";
import { toast } from "@/app/components/ui/toast-store";

export const portalChatConversationsQueryKey = [
  "portal-chat-conversations",
] as const;
export const scheduledEmailsQueryKey = ["scheduled-emails"] as const;

export const portalChatThreadQueryKey = (clientId: number) =>
  ["portal-chat-thread", clientId] as const;

/** Polls a client's portal chat thread. */
export function usePortalChatThread(clientId: number) {
  return useQuery<{ portalId: number; messages: PortalChatMessage[] }>({
    queryKey: portalChatThreadQueryKey(clientId),
    queryFn: async () => {
      const res = await axios.get(`/api/portal-chat/${clientId}`);
      return res.data;
    },
    refetchInterval: 5000,
  });
}

/** Optimistically sends an agency reply in a client's portal chat thread. */
export function useSendPortalChatMessage(clientId: number) {
  const queryClient = useQueryClient();
  const queryKey = portalChatThreadQueryKey(clientId);

  return useMutation({
    mutationFn: async (body: string) => {
      const res = await axios.post(`/api/portal-chat/${clientId}`, {
        message: body,
      });
      return res.data as PortalChatMessage;
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{
        portalId: number;
        messages: PortalChatMessage[];
      }>(queryKey);
      const optimistic: PortalChatMessage = {
        id: -Date.now(),
        senderType: "agency",
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<{
        portalId: number;
        messages: PortalChatMessage[];
      }>(queryKey, (old) =>
        old
          ? { ...old, messages: [...old.messages, optimistic] }
          : { portalId: 0, messages: [optimistic] }
      );
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        // Refresh the conversation list so unread/last-message updates
        queryClient.invalidateQueries({
          queryKey: portalChatConversationsQueryKey,
        }),
      ]);
    },
  });
}

/** Whether the agency's Outlook email account is connected. */
export function useEmailConnectionStatus() {
  return useQuery<boolean>({
    queryKey: ["email-connection"],
    queryFn: async () => {
      const res = await axios.get("/api/integrations/outlook");
      return res.data.connected;
    },
  });
}

/** All scheduled/sent/failed outbound emails. */
export function useScheduledMessages() {
  return useQuery<ScheduledEmail[]>({
    queryKey: scheduledEmailsQueryKey,
    queryFn: async () => {
      const res = await axios.get("/api/scheduled-emails");
      return res.data.scheduledEmails || [];
    },
  });
}

/** Deletes a scheduled message. */
export function useDeleteScheduledMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/scheduled-emails`, { params: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: scheduledEmailsQueryKey,
      });
      toast.success({
        title: "Deleted",
        description: "Message deleted successfully",
      });
    },
    onError: async () => {
      toast.error({ title: "Failed", description: "Message failed to delete" });
    },
  });
}

/** Sends a pending scheduled message immediately. */
export function useSendScheduledMessageNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (msg: ScheduledEmail) => {
      await axios.post("/api/scheduled-emails", {
        data: msg.id,
        type: "send-now",
      });
    },
    onMutate: async (msg) => {
      await queryClient.cancelQueries({ queryKey: scheduledEmailsQueryKey });
      const previous = queryClient.getQueryData<ScheduledEmail[]>(
        scheduledEmailsQueryKey
      );
      queryClient.setQueryData<ScheduledEmail[]>(
        scheduledEmailsQueryKey,
        (old) =>
          old?.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  status: "sent",
                  sentAt: new Date().toISOString(),
                  errorMessage: null,
                }
              : m
          )
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success({
        title: "Sent",
        description: "Message sent successfully",
      });
    },
    onError: (_error, _msg, context) => {
      if (context?.previous) {
        queryClient.setQueryData(scheduledEmailsQueryKey, context.previous);
      }
      toast.error({ title: "Failed", description: "Message failed to send" });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: scheduledEmailsQueryKey,
      });
    },
  });
}

/** Schedules a new outbound email. */
export function useScheduleMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScheduleEmailInput) => {
      await axios.post("/api/scheduled-emails", {
        data: { ...input },
        type: "schedule",
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: scheduledEmailsQueryKey });
      const previous = queryClient.getQueryData<ScheduledEmail[]>(
        scheduledEmailsQueryKey
      );
      const optimistic: ScheduledEmail = {
        id: -Date.now(),
        toEmail: input.toEmail,
        toName: input.toName ?? null,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText ?? null,
        scheduledAt: input.scheduledAt,
        timezone: input.timezone ?? "UTC",
        recurring: input.recurring ?? "none",
        status: "pending",
        sentAt: null,
        errorMessage: null,
        attachments: input.attachments ?? [],
        clientId: input.clientId ?? null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ScheduledEmail[]>(
        scheduledEmailsQueryKey,
        (old) => [optimistic, ...(old ?? [])]
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success({
        title: "Scheduled",
        description: "Message scheduled successfully",
      });
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(scheduledEmailsQueryKey, context.previous);
      }
      toast.error({
        title: "Failed",
        description: "Message scheduled failed",
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: scheduledEmailsQueryKey,
      });
    },
  });
}
