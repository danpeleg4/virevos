"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MoreVertical,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { EventDetailsDialog } from "./EventDetailsDialog";
import { BookEventDialog } from "@/app/components/BookEventDialog";
import type { Event } from "@/types/meeting";
import axios from "axios";
import {
  addMeetingToCalendar,
  deleteEventFromCalendar,
  updateEventDateTime,
} from "@/lib/calendar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const hours = Array.from({ length: 24 }, (_, i) => i);

function formatHour(hour: number) {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${h}:00 ${ampm}`;
}

function EventStatusPill({ status }: { status: string | undefined }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
        <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
        Live
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 border border-blue-200">
        <span className="w-1 h-1 rounded-full bg-blue-500 inline-block" />
        Upcoming
      </span>
    );
  }
  return null;
}

interface DragState {
  eventId: string;
  offsetMinutes: number;
}

export function CalendarView({ tabNav }: { tabNav?: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Event | null>(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rowHeight, setRowHeight] = useState(64);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropMinutes, setDropMinutes] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculate = () => {
      if (!gridRef.current) return;
      const top = gridRef.current.getBoundingClientRect().top;
      const available = window.innerHeight - top - 16;
      setRowHeight(Math.max(64, Math.floor(available / 24)));
    };
    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  const meetings = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const res = await axios.get("/api/events");
      const data: Event[] = res.data;
      return data.map((m) => ({ ...m, attendees: m.attendees ?? [] }));
    },
  });

  const mutation = useMutation({
    mutationFn: async (meeting: Event) => addMeetingToCalendar(meeting),
    onMutate: async (newMeeting) => {
      await queryClient.cancelQueries({ queryKey: ["meetings"] });
      const previousMeetings = queryClient.getQueryData<Event[]>(["meetings"]);
      queryClient.setQueryData<Event[]>(["meetings"], (old = []) => [
        ...old,
        {
          ...newMeeting,
          id: `temp-${Date.now()}`,
          attendees: newMeeting.attendees ?? [],
        },
      ]);
      return { previousMeetings };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
    onError: (err, _newMeeting, context) => {
      console.error("Failed to save meeting:", err);
      if (context?.previousMeetings) {
        queryClient.setQueryData(["meetings"], context.previousMeetings);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => deleteEventFromCalendar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, dateTime }: { id: string; dateTime: Date }) =>
      updateEventDateTime(id, dateTime),
    onMutate: async ({ id, dateTime }) => {
      await queryClient.cancelQueries({ queryKey: ["meetings"] });
      const previousMeetings = queryClient.getQueryData<Event[]>(["meetings"]);
      queryClient.setQueryData<Event[]>(["meetings"], (old = []) =>
        old.map((m) => (m.id === id ? { ...m, dateTime: dateTime } : m))
      );
      return { previousMeetings };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMeetings) {
        queryClient.setQueryData(["meetings"], context.previousMeetings);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    meeting: Event
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const offsetMinutes = Math.round((offsetY / rowHeight) * 60);
    setDragState({ eventId: meeting.id, offsetMinutes });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropMinutes(null);
  };

  const handleGridDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dragState) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinutes =
      Math.round((y / rowHeight) * 60) - dragState.offsetMinutes;
    const snapped = Math.max(
      0,
      Math.min(23 * 60 + 45, Math.round(rawMinutes / 15) * 15)
    );
    setDropMinutes(snapped);
  };

  const handleGridDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragState || dropMinutes === null) return;
    const newDate = new Date(currentDate);
    newDate.setHours(Math.floor(dropMinutes / 60), dropMinutes % 60, 0, 0);
    updateEvent.mutate({ id: dragState.eventId, dateTime: newDate });
    setDragState(null);
    setDropMinutes(null);
  };

  const dayMeetings = meetings?.data?.filter(
    (m) => new Date(m.dateTime).toDateString() === currentDate.toDateString()
  );

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isToday = currentDate.toDateString() === new Date().toDateString();

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-muted/50 shrink-0 overflow-x-auto">
        {tabNav && (
          <div className="flex items-center gap-1 shrink-0">{tabNav}</div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handlePrevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {formattedDate}
            </span>
            {isToday && (
              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                Today
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Go to Today
          </Button>
          <BookEventDialog
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            addMeeting={(meeting) => mutation.mutate(meeting)}
          />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div ref={gridRef} className="h-full overflow-y-auto">
          {/* Grid: hour rows + absolutely positioned events */}
          <div
            className="relative"
            style={{ height: rowHeight * 24 }}
            onDragOver={handleGridDragOver}
            onDrop={handleGridDrop}
          >
            {/* Hour lines */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 flex border-b border-border hover:bg-muted/40 transition-colors"
                style={{ top: hour * rowHeight, height: rowHeight }}
              >
                <div className="w-20 shrink-0 px-3 pt-2 text-xs text-muted-foreground border-r border-border text-right">
                  {formatHour(hour)}
                </div>
              </div>
            ))}

            {/* Drop indicator */}
            {dragState && dropMinutes !== null && (
              <div
                className="absolute left-20 right-0 h-0.5 bg-blue-500 z-10 pointer-events-none"
                style={{ top: (dropMinutes / 60) * rowHeight }}
              >
                <span className="absolute left-0 -top-2.5 text-[10px] text-blue-600 font-medium bg-card px-1 rounded">
                  {`${Math.floor(dropMinutes / 60) % 12 || 12}:${String(dropMinutes % 60).padStart(2, "0")} ${Math.floor(dropMinutes / 60) >= 12 ? "PM" : "AM"}`}
                </span>
              </div>
            )}

            {/* Events overlay — starts after the 80px time column */}
            <div
              className="absolute top-0 bottom-0 right-0 pr-2"
              style={{ left: 84 }}
            >
              {dayMeetings?.map((meeting) => {
                const start = new Date(meeting.dateTime);
                const startMinutes = start.getHours() * 60 + start.getMinutes();
                const duration = Math.max(15, meeting.duration ?? 60);
                const top = (startMinutes / 60) * rowHeight;
                const height = Math.max(24, (duration / 60) * rowHeight) - 2;
                const isCompact = height < 44;

                return (
                  <div
                    key={meeting.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, meeting)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      setSelectedMeeting(meeting);
                      setShowMeetingDetails(true);
                    }}
                    style={{
                      top,
                      height,
                      position: "absolute",
                      left: 0,
                      right: 4,
                      opacity: dragState?.eventId === meeting.id ? 0.4 : 1,
                    }}
                    className={`group rounded-lg border cursor-pointer active:cursor-grabbing transition-shadow hover:shadow-md overflow-hidden px-2 py-1 ${
                      meeting.status === "active"
                        ? "bg-red-50 border-red-200 text-red-900"
                        : meeting.status === "upcoming"
                          ? "bg-blue-50 border-blue-200 text-blue-900"
                          : "bg-muted/50 border-border text-foreground"
                    }`}
                  >
                    {/* Title row — always visible */}
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-[10px] font-mono opacity-60 shrink-0">
                          {new Date(meeting.dateTime).toLocaleTimeString(
                            "en-US",
                            { hour: "numeric", minute: "2-digit" }
                          )}
                        </span>
                        <span className="text-xs font-medium truncate">
                          {decodeURIComponent(meeting.title)}
                        </span>
                        {!isCompact && (
                          <EventStatusPill status={meeting.status} />
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEvent.mutate(meeting.id);
                            }}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Detail row — only if enough height */}
                    {!isCompact && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {meeting.duration && (
                          <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                            {meeting.duration}m
                          </span>
                        )}
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <div className="flex -space-x-1">
                            {meeting.attendees
                              .slice(0, 3)
                              .map((attendee, i) => (
                                <Avatar
                                  key={i}
                                  className="h-4 w-4 border border-card ring-0"
                                >
                                  <AvatarFallback className="text-[8px] bg-blue-100 text-blue-600">
                                    {attendee.initials}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            {meeting.attendees.length > 3 && (
                              <div className="h-4 w-4 rounded-full border border-card bg-muted flex items-center justify-center text-[8px] text-muted-foreground">
                                +{meeting.attendees.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        {meeting.autoRescheduled && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                            <Sparkles className="h-2.5 w-2.5" />
                            Auto
                          </span>
                        )}
                        {meeting.hasNotes && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            <FileText className="h-2.5 w-2.5" />
                            Notes
                          </span>
                        )}
                      </div>
                    )}

                    {meeting.conflictReason && !isCompact && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-orange-600">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {meeting.conflictReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
