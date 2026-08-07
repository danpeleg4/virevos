"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Event } from "@/types/meeting";

export const meetingsQueryKey = ["meetings"] as const;

/**
 * All calendar events, with `attendees` normalized to an array. Shared by
 * CalendarView and Meetings, which previously each defined this query.
 */
export function useMeetings() {
  return useQuery<Event[]>({
    queryKey: meetingsQueryKey,
    queryFn: async () => {
      const res = await axios.get("/api/events");
      const data: Event[] = res.data;
      return data.map((m) => ({ ...m, attendees: m.attendees ?? [] }));
    },
  });
}

/** Optimistically adds a meeting to the calendar. */
export function useAddMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meeting: Event) => {
      const res = await axios.post("/api/events", meeting);
      return res.data;
    },
    onMutate: async (newMeeting) => {
      await queryClient.cancelQueries({ queryKey: meetingsQueryKey });
      const previousMeetings =
        queryClient.getQueryData<Event[]>(meetingsQueryKey);
      queryClient.setQueryData<Event[]>(meetingsQueryKey, (old = []) => [
        ...old,
        {
          ...newMeeting,
          id: `temp-${Date.now()}`,
          attendees: newMeeting.attendees ?? [],
        },
      ]);
      return { previousMeetings };
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: meetingsQueryKey }),
    onError: (err, _newMeeting, context) => {
      console.error("Failed to save meeting:", err);
      if (context?.previousMeetings) {
        queryClient.setQueryData(meetingsQueryKey, context.previousMeetings);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: meetingsQueryKey }),
  });
}

/** Optimistically removes a meeting from the calendar. */
export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(`/api/events/${id}`);
      return res.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: meetingsQueryKey });
      const previousMeetings =
        queryClient.getQueryData<Event[]>(meetingsQueryKey);
      queryClient.setQueryData<Event[]>(meetingsQueryKey, (old = []) =>
        old.filter((m) => m.id !== id)
      );
      return { previousMeetings };
    },
    onError: (_err, _id, context) => {
      if (context?.previousMeetings) {
        queryClient.setQueryData(meetingsQueryKey, context.previousMeetings);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: meetingsQueryKey }),
  });
}

/** Optimistically reschedules a meeting (calendar drag-and-drop). */
export function useUpdateMeetingTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dateTime }: { id: string; dateTime: Date }) => {
      const res = await axios.patch(`/api/events/${id}`, {
        type: "reschedule",
        data: { dateTime: dateTime.toISOString() },
      });
      return res.data;
    },
    onMutate: async ({ id, dateTime }) => {
      await queryClient.cancelQueries({ queryKey: meetingsQueryKey });
      const previousMeetings =
        queryClient.getQueryData<Event[]>(meetingsQueryKey);
      queryClient.setQueryData<Event[]>(meetingsQueryKey, (old = []) =>
        old.map((m) => (m.id === id ? { ...m, dateTime: dateTime } : m))
      );
      return { previousMeetings };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMeetings) {
        queryClient.setQueryData(meetingsQueryKey, context.previousMeetings);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: meetingsQueryKey }),
  });
}

/** Starts a new instant meeting. */
export function useCreateMeeting() {
  return useMutation({
    mutationFn: async (title: string) => {
      const res = await axios.post("/api/meetings", { title });
      return res.data as { id?: string; link?: string };
    },
  });
}

/** Whether video meetings auto-record. */
export function useRecordingStatus() {
  return useQuery<{ recording_status: boolean }>({
    queryKey: ["recordingStatus"],
    queryFn: async () => {
      const res = await axios.get("/api/recording/status");
      return res.data;
    },
  });
}

/** Optimistically toggles auto-record for video meetings. */
export function useToggleRecordingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axios.patch("/api/user", { type: "recording-status" });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["recordingStatus"] });
      const previous = queryClient.getQueryData<{
        recording_status: boolean;
      }>(["recordingStatus"]);
      queryClient.setQueryData<{ recording_status: boolean }>(
        ["recordingStatus"],
        (old) => ({ recording_status: !(old?.recording_status ?? false) })
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["recordingStatus"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["recordingStatus"] });
    },
  });
}

/** Connects/disconnects a scheduling integration (currently: Outlook). */
export function useToggleIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "disconnect" | "connect";
    }) => {
      if (id === "outlook" && action === "disconnect") {
        await axios.delete("/api/integrations/outlook");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}
