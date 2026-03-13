"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar as CalendarIcon,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { motion } from "motion/react";
import { EventDetailsDialog } from "./EventDetailsDialog";
import { BookEventDialog } from "@/app/components/BookEventDialog";
import type { Event } from "@/types/meeting";
import axios from "axios";
import {
  addMeetingToCalendar,
  deleteEventFromCalendar,
} from "@/lib/calendar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const hours = Array.from({ length: 24 }, (_, i) => i);

export function CalendarView() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Event | null>(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const meetings = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const res = await axios.get("/api/events");
      const data: Event[] = res.data;

      // Ensure attendees array exists to avoid runtime crashes
      return data.map((m) => ({
        ...m,
        attendees: m.attendees ?? [],
      }));
    },
  });

  const mutation = useMutation({
    mutationFn: async (meeting: Event) => {
      const res = await addMeetingToCalendar(meeting);
      return res;
    },
    onMutate: async (newMeeting) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["meetings"] });

      // Snapshot the previous value
      const previousMeetings = queryClient.getQueryData<Event[]>(["meetings"]);

      // Optimistically update to the new value
      queryClient.setQueryData<Event[]>(["meetings"], (old = []) => {
        const optimisticMeeting: Event = {
          ...newMeeting,
          id: `temp-${Date.now()}`, // Temporary ID until server responds
          attendees: newMeeting.attendees ?? [],
        };
        return [...old, optimisticMeeting];
      });

      return { previousMeetings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (err, newMeeting, context) => {
      console.error("Failed to save meeting:", err);

      // Rollback to the previous value on error
      if (context?.previousMeetings) {
        queryClient.setQueryData(["meetings"], context.previousMeetings);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteEventFromCalendar(id);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });

  const dayMeetings = meetings?.data?.filter((m) => {
    const meetingDate = new Date(m.dateTime).toDateString();
    const selectedDate = currentDate.toDateString();
    return meetingDate === selectedDate;
  });

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleMeetingClick = (meeting: Event) => {
    setSelectedMeeting(meeting);
    setShowMeetingDetails(true);
  };

  const addMeeting = async (meeting: Event) => {
    mutation.mutate(meeting);
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* === Controls === */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={handlePrevDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <CardTitle>{formattedDate}</CardTitle>

              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={handleNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={handleToday}
              >
                Today
              </Button>
            </div>

            {/* ADD EVENT BUTTON */}
            <BookEventDialog
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
              addMeeting={addMeeting}
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {hours.map((hour) => {
                const timeLabel = `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
                const meetingsAtTime = dayMeetings?.filter(
                  (m) => new Date(m.dateTime).getHours() === hour
                );

                return (
                  <div key={hour} className="flex hover:bg-gray-50">
                    <div className="w-20 p-3 text-sm text-gray-500 border-r  border-gray-100">
                      {timeLabel}
                    </div>

                    <div className="flex-1 p-2 min-h-[80px] relative">
                      {meetingsAtTime?.map((meeting) => (
                        <motion.div
                          key={meeting.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-2"
                        >
                          <div
                            onClick={() => handleMeetingClick(meeting)}
                            className={`p-3 rounded-lg border cursor-pointer hover:shadow-md bg-blue-100 text-blue-700 border-blue-200`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <CalendarIcon className="h-3 w-3" />
                                <span className="text-sm">
                                  {decodeURIComponent(meeting.title)}
                                </span>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      deleteEvent.mutate(meeting.id)
                                    }
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs opacity-75">
                                  {meeting.duration} min
                                </span>

                                {meeting.attendees && (
                                  <div className="flex -space-x-2">
                                    {meeting.attendees.map((attendee, i) => (
                                      <Avatar
                                        key={i}
                                        className="h-6 w-6 border-2 border-white"
                                      >
                                        <AvatarFallback className="text-xs">
                                          {attendee.initials}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center space-x-1">
                                {meeting.autoRescheduled && (
                                  <Badge variant="outline" className="text-xs">
                                    Auto
                                  </Badge>
                                )}
                                {meeting.hasNotes && (
                                  <Badge variant="outline" className="text-xs">
                                    Notes
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {meeting.conflictReason && (
                              <div className="mt-2 text-xs opacity-75 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {meeting.conflictReason}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === Meeting Details Dialog === */}
      {selectedMeeting && (
        <EventDetailsDialog
          event={selectedMeeting}
          open={showMeetingDetails}
          onOpenChange={setShowMeetingDetails}
        />
      )}
    </div>
  );
}
