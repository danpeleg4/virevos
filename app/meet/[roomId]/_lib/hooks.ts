"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";

/** Meeting details + whether the current user is the host. */
export function useMeetingInfo(meetingId: string) {
  return useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const res = await axios.get(`/api/events/${meetingId}`);
      return res.data;
    },
  });
}

/** Marks a scheduled meeting as started. */
export function useStartMeeting(meetingId: string) {
  return useMutation({
    mutationFn: async () => {
      await axios.patch(`/api/events/${meetingId}`, { type: "start" });
    },
  });
}
