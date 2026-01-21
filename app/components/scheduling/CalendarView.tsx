"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Video,
    AlertCircle,
    CheckCircle,
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
import { MeetingDetailsDialog } from "./MeetingDetailsDialog";
import { BookMeetingDialog } from "@/app/components/BookMeetingDialog";
import type {Meeting, MeetingType, NewMeetingInput} from "@/types/meeting";
import axios from "axios";
import { addMeetingToCalendar, deleteEventFromCalendar } from '@/lib/server_actions/calendar'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const hours = Array.from({ length: 24 }, (_, i) => i);

export function CalendarView() {
    const queryClient = useQueryClient();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [showMeetingDetails, setShowMeetingDetails] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    function parseLocalDate(dateStr: string) {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day); // LOCAL date, not UTC
    }

    const getMeetingTypes = useQuery<MeetingType[]>({
        queryKey: ["meetingTypes"],
        queryFn: async () => {
            const res = await axios.get('/api/meetings/meeting-types')
            return res.data
        }
    })

    const meetings = useQuery({
        queryKey: ["meetings"],
        queryFn: async () => {
            const res = await axios.get("/api/meetings");
            const data: Meeting[] = res.data;

            // Ensure attendees array exists to avoid runtime crashes
            return data.map(m => ({
                ...m,
                attendees: m.attendees ?? [],
            }));
        }
    })

    //TODO ADD OPTIMISTIC UPDATES
    const mutation = useMutation({
        mutationFn: async (meeting: NewMeetingInput) => {
            const res = await addMeetingToCalendar(meeting);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["meetings"] });
        },
        onError: (err) => {
            console.error("Failed to save meeting:", err);
        }
    });

    const deleteEvent = useMutation({
        mutationFn: async (id: string) => {
            const res = await deleteEventFromCalendar(id);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["meetings"] });
        },
    })


    const dayMeetings = meetings?.data?.filter(m => {
        const meetingDate = parseLocalDate(m.date).toDateString();
        const selectedDate = currentDate.toDateString();
        return meetingDate === selectedDate;
    });

    const formattedDate = currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    function parseHour(timeStr: string) {
        const [timePart, modifier] = timeStr.split(" ");
        const [h] = timePart.split(":");
        let hour = parseInt(h);

        if (modifier === "PM" && hour !== 12) hour += 12;
        if (modifier === "AM" && hour === 12) hour = 0;

        return hour;
    }

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

    const handleMeetingClick = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setShowMeetingDetails(true);
    };

    const addMeeting = async (meeting: NewMeetingInput) => {
        mutation.mutate(meeting);
    };

    const getStatusColor = (type: string) => {
        const types = getMeetingTypes?.data;
        if (!types) return "bg-gray-100 text-gray-700 border-gray-200";

        const t = types.find(mt => mt.name === type);
        if (!t) return "bg-gray-100 text-gray-700 border-gray-200";

        // Derive Tailwind classes dynamically
        const bg = `bg-${t.color.toLowerCase()}-100`;
        const text = `text-${t.color.toLowerCase()}-700`;
        const border = `border-${t.color.toLowerCase()}-200`;

        return `${bg} ${text} ${border}`;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "zoom":
                return <Video className="h-3 w-3" />;
            case "google-meet":
                return <Video className="h-3 w-3" />;
            default:
                return <CalendarIcon className="h-3 w-3" />;
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full min-h-0">
        {/* === Stats Cards === */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Today&#39;s Meetings</p>
                                <p className="text-2xl text-gray-900 mt-1">{dayMeetings?.length}</p>
                            </div>
                            <CalendarIcon className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Auto-Rescheduled</p>
                                <p className="text-2xl text-gray-900 mt-1">
                                    {dayMeetings?.filter((m) => m.autoRescheduled).length}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Conflicts Detected</p>
                                <p className="text-2xl text-gray-900 mt-1">
                                    {dayMeetings?.filter((m) => m.status === "conflict").length}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Meeting Hours</p>
                                <p className="text-2xl text-gray-900 mt-1">
                                {((dayMeetings?.reduce((a, m) => a + (m.duration || 0), 0) ?? 0) / 60).toFixed(1)}h
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* === Controls === */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button className="cursor-pointer" variant="outline" size="sm" onClick={handlePrevDay}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <CardTitle>{formattedDate}</CardTitle>

                            <Button className="cursor-pointer" variant="outline" size="sm" onClick={handleNextDay}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>

                            <Button className="cursor-pointer" variant="outline" size="sm" onClick={handleToday}>
                                Today
                            </Button>
                        </div>

                        {/* ADD EVENT BUTTON */}
                        <BookMeetingDialog
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
                                const meetingsAtTime = dayMeetings?.filter(m => parseHour(m.time) === hour);

                                return (
                                    <div key={hour} className="flex hover:bg-gray-50">
                                        <div className="w-20 p-3 text-sm text-gray-500 border-r border-gray-100">
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
                                                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-md ${getStatusColor(
                                                            meeting.type
                                                        )}`}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center space-x-2">
                                                                {getTypeIcon(meeting.type)}
                                                                <span className="text-sm">{decodeURIComponent(meeting.title)}</span>
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
                                                                    <DropdownMenuItem onClick={() => deleteEvent.mutate(meeting.id)}>Delete</DropdownMenuItem>
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
                                                                            <Avatar key={i} className="h-6 w-6 border-2 border-white">
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
                <MeetingDetailsDialog
                    meeting={selectedMeeting}
                    open={showMeetingDetails}
                    onOpenChange={setShowMeetingDetails}
                />
            )}
        </div>
    );
}