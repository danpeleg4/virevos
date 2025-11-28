"use client";

import { useEffect, useState } from "react";
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
import type { Meeting, NewMeetingInput } from "@/types/meeting";
import axios from "axios";

const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM - 9 PM

export function CalendarView() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [showMeetingDetails, setShowMeetingDetails] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    function parseLocalDate(dateStr: string) {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day); // LOCAL date, not UTC
    }

    const dayMeetings = meetings.filter(m => {
        const meetingDate = parseLocalDate(m.date).toDateString();
        const selectedDate = currentDate.toDateString();
        return meetingDate === selectedDate;
    });

    useEffect(() => {
        async function load(){
            try {
                const res = await axios.get("/api/meetings");
                const data: Meeting[] = res.data;

                // Ensure attendees array exists to avoid runtime crashes
                const normalized = data.map(m => ({
                    ...m,
                    attendees: m.attendees ?? [],
                }));
                console.log("Fetched meetings:", normalized);

                setMeetings(normalized);
            } catch (err) {
                // If fetch fails, keep mockMeetings and optionally log
                console.error("Failed to load meetings:", err);
            }
        }
        load();
    }, []);

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
        try {
            const res = await axios.post("/api/meetings", meeting);
            const saved: Meeting = res.data;

            // Normalize attendees presence
            setMeetings(prev => [...prev, { ...saved, attendees: saved.attendees ?? [] }]);
        } catch (err) {
            console.error("Failed to save meeting:", err);
            // Optionally: optimistic update fallback
            // Optimistic fallback assumes link may be missing, so coerce a link placeholder
            const optimistic: Meeting = {
                link: "",
                attendees: meeting.attendees ?? [],
                hasNotes: meeting.hasNotes ?? false,
                hasTranscript: meeting.hasTranscript ?? false,
                autoRescheduled: meeting.autoRescheduled ?? false,
                conflictReason: meeting.conflictReason ?? undefined,
                ...meeting,
            };
            setMeetings(prev => [...prev, optimistic]);
        }
    };

    const getStatusColor = (status: Meeting["status"]) => {
        switch (status) {
            case "scheduled":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "rescheduled":
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "conflict":
                return "bg-red-100 text-red-700 border-red-200";
            case "completed":
                return "bg-green-100 text-green-700 border-green-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getTypeIcon = (type: Meeting["type"]) => {
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
        <div className="space-y-6">
            {/* === Stats Cards === */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Today&#39;s Meetings</p>
                                <p className="text-2xl text-gray-900 mt-1">{dayMeetings.length}</p>
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
                                    {dayMeetings.filter((m) => m.autoRescheduled).length}
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
                                    {dayMeetings.filter((m) => m.status === "conflict").length}
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
                                    {(dayMeetings.reduce((a, m) => a + (m.duration || 0), 0) / 60).toFixed(1)}h
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* === Controls === */}
            <Card>
                <CardHeader>
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

                        {/* NEW BOOK MEETING BUTTON */}
                        <BookMeetingDialog
                            dialogOpen={dialogOpen}
                            setDialogOpen={setDialogOpen}
                            addMeeting={addMeeting}
                        />
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {hours.map((hour) => {
                                const timeLabel = `${hour > 12 ? hour - 12 : hour}:00 ${
                                    hour >= 12 ? "PM" : "AM"
                                }`;

                                const meetingsAtTime = dayMeetings.filter(m => parseHour(m.time) === hour);

                                return (
                                    <div key={hour} className="flex hover:bg-gray-50">
                                        <div className="w-20 p-3 text-sm text-gray-500 border-r border-gray-100">
                                            {timeLabel}
                                        </div>

                                        <div className="flex-1 p-2 min-h-[80px] relative">
                                            {meetingsAtTime.map((meeting) => (
                                                <motion.div
                                                    key={meeting.id}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mb-2"
                                                >
                                                    <div
                                                        onClick={() => handleMeetingClick(meeting)}
                                                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-md ${getStatusColor(
                                                            meeting.status
                                                        )}`}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center space-x-2">
                                                                {getTypeIcon(meeting.type)}
                                                                <span className="text-sm">{meeting.title}</span>
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
                                                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                                                    <DropdownMenuItem>Reschedule</DropdownMenuItem>
                                                                    <DropdownMenuItem>Cancel</DropdownMenuItem>
                                                                    <DropdownMenuItem>
                                                                        Copy Meeting Link
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
