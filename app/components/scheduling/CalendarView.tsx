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

interface Meeting {
    id: string;
    title: string;
    time: string;
    duration: number;
    type: "zoom" | "google-meet" | "in-person";
    attendees: { name: string; initials: string }[];
    status: "scheduled" | "rescheduled" | "conflict" | "completed";
    conflictReason?: string;
    autoRescheduled?: boolean;
    hasNotes?: boolean;
    hasTranscript?: boolean;
}

const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM - 9 PM

const mockMeetings: Meeting[] = [
    {
        id: "1",
        title: "Client Onboarding - Acme Corp",
        time: "9:00 AM",
        duration: 60,
        type: "zoom",
        attendees: [
            { name: "Sarah Johnson", initials: "SJ" },
            { name: "Mike Chen", initials: "MC" },
        ],
        status: "completed",
        hasNotes: true,
        hasTranscript: true,
    },
    {
        id: "2",
        title: "Design Review",
        time: "11:00 AM",
        duration: 30,
        type: "google-meet",
        attendees: [{ name: "Alex Kim", initials: "AK" }],
        status: "scheduled",
    },
    {
        id: "3",
        title: "Sprint Planning",
        time: "2:00 PM",
        duration: 90,
        type: "zoom",
        attendees: [
            { name: "Team", initials: "T" },
            { name: "John Doe", initials: "JD" },
        ],
        status: "rescheduled",
        autoRescheduled: true,
        conflictReason: "Overlapped with urgent client call",
    },
    {
        id: "4",
        title: "Q4 Planning Session",
        time: "4:00 PM",
        duration: 60,
        type: "zoom",
        attendees: [
            { name: "Emily Davis", initials: "ED" },
            { name: "Robert Wilson", initials: "RW" },
        ],
        status: "conflict",
        conflictReason: "Exceeds daily meeting capacity (6 hours)",
    },
];

export function CalendarView() {
    // Now we store meetings in state:
    const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [showMeetingDetails, setShowMeetingDetails] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

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

    const handleMeetingClick = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setShowMeetingDetails(true);
    };

    const addMeeting = (meeting: Meeting) => {
        setMeetings((prev) => [...prev, meeting]);
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
                                <p className="text-sm text-gray-600">Today's Meetings</p>
                                <p className="text-2xl text-gray-900 mt-1">{meetings.length}</p>
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
                                    {meetings.filter((m) => m.autoRescheduled).length}
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
                                    {meetings.filter((m) => m.status === "conflict").length}
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
                                    {(meetings.reduce((a, m) => a + m.duration, 0) / 60).toFixed(1)}h
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
                            <Button variant="outline" size="sm" onClick={handlePrevDay}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <CardTitle>{formattedDate}</CardTitle>

                            <Button variant="outline" size="sm" onClick={handleNextDay}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>

                            <Button variant="outline" size="sm" onClick={handleToday}>
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

                                const meetingsAtTime = meetings.filter(
                                    (m) => m.time === timeLabel
                                );

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

                                                                <div className="flex -space-x-2">
                                                                    {meeting.attendees.map((attendee, i) => (
                                                                        <Avatar key={i} className="h-6 w-6 border-2 border-white">
                                                                            <AvatarFallback className="text-xs">
                                                                                {attendee.initials}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                    ))}
                                                                </div>
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
