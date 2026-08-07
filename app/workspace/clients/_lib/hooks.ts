"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  clients,
  CreateClientInput,
  UpdateClientInput,
} from "@/types/clients";
import type {
  PortalAvailability,
  PortalMeetingBooking,
  PortalRecord,
} from "@/types/portal";
import { toast } from "@/app/components/ui/toast-store";

export const clientsQueryKey = ["clients"] as const;
export const clientPortalQueryKey = (clientId: number) =>
  ["clientPortal", clientId] as const;
export const portalBookingsQueryKey = ["portalBookings"] as const;

/** All clients. */
export function useClients(enabled = true) {
  return useQuery<clients[]>({
    queryKey: clientsQueryKey,
    queryFn: async () => {
      const res = await axios.get("/api/clients");
      return res.data as clients[];
    },
    enabled,
  });
}

/** Deletes a client and invalidates the client list. */
export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/clients/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientsQueryKey });
    },
  });
}

/** Optimistically updates a client, syncing the client list cache. */
export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateClientInput) => {
      await axios.patch(`/api/clients/${input.id}`, input);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: clientsQueryKey });

      const previousClients =
        queryClient.getQueryData<clients[]>(clientsQueryKey) ?? [];

      queryClient.setQueryData<clients[]>(
        clientsQueryKey,
        previousClients.map((c) =>
          c.id === input.id
            ? {
                ...c,
                name: input.name ?? c.name,
                email: input.email ?? c.email,
                phone: input.phone ?? c.phone,
                status: input.status ?? c.status,
                notes: input.notes ?? c.notes,
              }
            : c
        )
      );

      return { previousClients };
    },
    onError: (_err, _input, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(clientsQueryKey, context.previousClients);
      }
      toast.error({ title: "Failed", description: "Failed to update client" });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: clientsQueryKey }),
  });
}

/** Optimistically appends a new client, syncing the client list cache. */
export function useAddClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newClient: CreateClientInput) => {
      const res = await axios.post("/api/clients", newClient);
      return res.data;
    },
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: clientsQueryKey });

      const previousClients =
        queryClient.getQueryData<clients[]>(clientsQueryKey) ?? [];

      const optimisticClient: clients = {
        id: Date.now(),
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        status: "active",
        activeCases: 0,
        completedCases: 0,
        avatar: newClient.name[0],
        notes: newClient.notes,
        totalCases: 0,
      };

      queryClient.setQueryData<clients[]>(clientsQueryKey, [
        ...previousClients,
        optimisticClient,
      ]);

      return { previousClients };
    },
    onError: (_err, _newClient, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(clientsQueryKey, context.previousClients);
      }
      toast.error({ title: "Failed", description: "Failed to add client" });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: clientsQueryKey }),
  });
}

interface ClientDetailResponse {
  client: clients;
  portal: unknown;
}

/** A single client's main profile. */
export function useClient(id: string) {
  return useQuery<ClientDetailResponse>({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await axios.get<ClientDetailResponse>(
        `/api/clients/${id}?type=main`
      );
      return data;
    },
    enabled: !!id,
  });
}

interface ClientCaseRow {
  id: number;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
  stats: { totalTasks: number; completedTasks: number; percentage: number };
}

/** Cases belonging to a client; disabled until the cases tab is active. */
export function useClientCases(id: string, enabled: boolean) {
  return useQuery<ClientCaseRow[]>({
    queryKey: ["clientCases", id],
    queryFn: async () => {
      const { data } = await axios.get<{ cases: ClientCaseRow[] }>(
        `/api/clients/${id}?type=cases`
      );
      return data.cases;
    },
    enabled: !!id && enabled,
  });
}

interface OutlookEmailRow {
  id: number;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[] | null;
  isRead: boolean | null;
  isSent: boolean | null;
  hasAttachments: boolean | null;
  sentAt: string;
}

/** Outlook emails linked to a client; disabled until the communications tab is active. */
export function useClientOutlookEmails(id: string, enabled: boolean) {
  return useQuery<OutlookEmailRow[]>({
    queryKey: ["clientOutlookEmails", id],
    queryFn: async () => {
      const { data } = await axios.get<{ emails: OutlookEmailRow[] }>(
        `/api/clients/${id}?type=outlook-emails`
      );
      return data.emails;
    },
    enabled: !!id && enabled,
  });
}

/**
 * A client's portal record. Shared by the client detail page and
 * ClientPortalSettings, which previously each defined this query themselves.
 */
export function useClientPortal(clientId: number) {
  return useQuery<PortalRecord | null>({
    queryKey: clientPortalQueryKey(clientId),
    queryFn: async () => {
      const { data } = await axios.get<{ portal: PortalRecord | null }>(
        `/api/clients/${clientId}?type=portal`
      );
      return data.portal;
    },
    enabled: !!clientId,
  });
}

export interface PortalSettingsPayload {
  enabled: boolean;
  settings: {
    title: string;
    welcomeMessage: string;
    chatEnabled: boolean;
    fileSharing: boolean;
    aiChatBot: boolean;
    emailNotifications: boolean;
    meetingSchedulingEnabled: boolean;
    availability: PortalAvailability;
  };
}

/** Saves a client's portal settings and invalidates the portal + bookings caches. */
export function useSavePortalSettings(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PortalSettingsPayload) => {
      await axios.post(`/api/clients/${clientId}/portal`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clientPortal", clientId],
      });
      await queryClient.invalidateQueries({ queryKey: portalBookingsQueryKey });
    },
    onError: (err: unknown) => {
      console.error("Failed to save settings:", err);
    },
  });
}

/** Pending/confirmed meeting requests across all portals. */
export function usePortalBookings(enabled: boolean) {
  return useQuery<
    (PortalMeetingBooking & { clientDisplayName: string | null })[]
  >({
    queryKey: portalBookingsQueryKey,
    queryFn: async () => {
      const { data } = await axios.get<{
        bookings: (PortalMeetingBooking & {
          clientDisplayName: string | null;
        })[];
      }>("/api/portal", { params: { type: "bookings" } });
      return data.bookings;
    },
    enabled,
  });
}

/** Confirms a pending portal booking. */
export function useConfirmBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number) => {
      await axios.patch(`/api/portal-bookings/${bookingId}`, {
        type: "accept",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalBookingsQueryKey });
      toast.success({
        title: "Confirmed",
        description: "Booking confirmed successfully",
      });
    },
    onError: async () => {
      toast.error({ title: "Failed", description: "Booking confirmed failed" });
    },
  });
}

/** Cancels a pending portal booking. */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number) => {
      await axios.patch(`/api/portal-bookings/${bookingId}`, {
        type: "status",
        data: { status: "cancelled" },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalBookingsQueryKey });
      toast.success({
        title: "Cancelled",
        description: "Booking cancelled successfully",
      });
    },
    onError: async () => {
      toast.error({ title: "Failed", description: "Booking cancelled failed" });
    },
  });
}
