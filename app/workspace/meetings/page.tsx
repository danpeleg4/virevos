"use client"

import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
    Video,
    Plus,
    Link2,
    Calendar,
    Clock,
    Users,
    Copy,
    Check,
    PlayCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {useQuery} from "@tanstack/react-query";
import axios from "axios";
import { Meeting } from "@/types/meeting";

export default function Meetings() {
    const [startModalOpen, setStartModalOpen] = useState(false);
    const [joinModalOpen, setJoinModalOpen] = useState(false);
    const [meetingName, setMeetingName] = useState("");
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [meetingLink, setMeetingLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [activeView, setActiveView] = useState<"home" | "in-meeting" | "summary" | "transcription">("home");
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const router = useRouter();

    const meetingURL = `${meetingName}-${crypto.randomUUID()}`

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

    const handleStartMeeting = () => {
        const link = `https://virevos.com/meet/${meetingURL}`;
        setMeetingLink(link);
        // In a real app, this would create the meeting and navigate to it
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(meetingLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoinMeeting = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setActiveView("in-meeting");
    };

    const handleViewSummary = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setActiveView("summary");
    };

    const handleViewTranscription = () => {
        setActiveView("transcription");
    };

    useEffect(() => {
        if (activeView === "in-meeting") {
            router.push(`/meet/${meetingURL}`);
        }
    }, [activeView, meetingName, router]);


    if (activeView === "summary") {
        return <MeetingSummary meeting={selectedMeeting!} onBack={() => setActiveView("home")} onViewTranscription={handleViewTranscription} />;
    }

    if (activeView === "transcription") {
        return <TranscriptionView meeting={selectedMeeting!} onBack={() => setActiveView("summary")} />;
    }

    const color = (meeting: Meeting) => {
        switch (meeting.status){
            case "live":
                return "text-red-600"
            case "upcoming":
                return "text-blue-600"
            default:
                return "text-gray-600"
        }
    }

    const bgColor = (meeting: Meeting) => {
        switch (meeting.status) {
            case "live":
                return "bg-red-100"
            case "upcoming":
                return "bg-blue-100"
            default:
                return "bg-gray-100"
        }
    }

    return (
        <div className={`p-6 space-y-6`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-3xl`}>
                        Meetings
                    </h1>
                    <p className={`mt-1`}>
                        Start or join video meetings instantly
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button onClick={() => setStartModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Start New Meeting
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-6 sm:grid-cols-3">
                <Card className={`p-6`}>
                    <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg`}>
                            <Video className={`h-5 w-5`} />
                        </div>
                        <div>
                            <p className={`text-sm`}>
                                Live Now
                            </p>
                            <p className={`text-2xl mt-1`}>
                                {meetings?.data?.filter((m) => m.status === "live").length}
                            </p>
                        </div>\
                    </div>
                </Card>
                <Card className={`p-6`}>
                    <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg`}>
                            <Calendar className={`h-5 w-5`} />
                        </div>
                        <div>
                            <p className={`text-sm`}>
                                Upcoming
                            </p>
                            <p className={`text-2xl mt-1 `}>
                                {meetings?.data?.filter((m) => m.status === "upcoming").length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className={`p-6 `}>
                    <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg`}>
                            <PlayCircle className={`h-5 w-5`} />
                        </div>
                        <div>
                            <p className={`text-sm`}>
                                Recordings
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
                <h2 className={`text-xl `}>
                    Your Meetings
                </h2>
                <div className="space-y-3">
                    {meetings?.data?.map((meeting) => (
                        <motion.div
                            key={meeting.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card
                                className={`p-5 hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div
                                            className={`p-3 rounded-lg ${bgColor(meeting)}`}
                                        >
                                            <Video
                                                className={`h-5 w-5 ${color(meeting)}`}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <h3
                                                    className={`text-gray-900`}
                                                >
                                                    {meeting.title}
                                                </h3>
                                                <Badge
                                                    className={
                                                        meeting.status === "live"
                                                            ? "bg-red-100 text-red-700 border-red-200"
                                                            : meeting.status === "upcoming"
                                                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                                                : "bg-gray-100 text-gray-700 border-gray-200"
                                                    }
                                                >
                                                    {meeting.status}
                                                </Badge>
                                            </div>
                                            <div
                                                className={`flex items-center space-x-4 text-sm text-gray-600`}
                                            >
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{meeting.date}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{meeting.time}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Users className="h-3 w-3" />
                                                    <span>{meeting.attendees.length} participants</span>
                                                </div>
                                                {meeting.duration && (
                                                    <span>• Duration: {meeting.duration}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {meeting.status === "live" && (
                                            <Button onClick={() => handleJoinMeeting(meeting)}>
                                                <Video className="h-4 w-4 mr-2" />
                                                Join Now
                                            </Button>
                                        )}
                                        {meeting.status === "ended" && (
                                            <Button variant="outline" onClick={() => handleViewSummary(meeting)}>
                                                <PlayCircle className="h-4 w-4 mr-2" />
                                                View Recording
                                            </Button>
                                        )}
                                        {meeting.status === "upcoming" && (
                                            <Button variant="outline">
                                                <Calendar className="h-4 w-4 mr-2" />
                                                Details
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Start Meeting Modal */}
            <Dialog open={startModalOpen} onOpenChange={setStartModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Start New Meeting</DialogTitle>
                        <DialogDescription>
                            Configure your meeting settings before starting
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Meeting Name</Label>
                            <Input
                                placeholder="Team Standup"
                                value={meetingName}
                                onChange={(e) => setMeetingName(e.target.value)}
                                className="mt-2"
                            />
                        </div>

                        {!meetingLink ? (
                            <Button
                                className="w-full"
                                onClick={handleStartMeeting}
                                disabled={!meetingName}
                            >
                                Start Meeting
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <div
                                    className={`p-3 rounded-lg border bg-gray-50 border-gray-200`}
                                >
                                    <p
                                        className={`text-xs mb-2 text-gray-600`}
                                    >
                                        Meeting Link
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p
                                            className={`text-sm text-gray-700 truncate flex-1`}
                                        >
                                            {meetingLink}
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCopyLink}
                                            className="ml-2"
                                        >
                                            {copied ? (
                                                <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => {
                                        setStartModalOpen(false);
                                    }}
                                >
                                    <Video className="h-4 w-4 mr-2" />
                                    Join Meeting Now
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Join Meeting Modal */}
            <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Join Meeting</DialogTitle>
                        <DialogDescription>
                            Enter the meeting link or ID to join
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Meeting Link or ID</Label>
                            <Input
                                placeholder="https://meet.virevos.com/abc123xyz"
                                className="mt-2"
                            />
                        </div>

                        <Button className="w-full">Join Meeting</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Meeting Summary Component
function MeetingSummary({ meeting, onBack, onViewTranscription }: { meeting: Meeting; onBack: () => void; onViewTranscription: () => void }) {

    return (
        <div className={`p-6 space-y-6`}>
            <div className="flex items-center space-x-4 mb-6">
                <Button variant="ghost" onClick={onBack}>
                    ← Back
                </Button>
            </div>

            <div>
                <h1 className={`text-3xl `}>
                    {meeting.title}
                </h1>
                <p className={`mt-1 text-gray-600`}>
                    {meeting.date} at {meeting.time} • {meeting.duration}
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recording Playback */}
                <Card className={`p-6 `}>
                    <h3 className={`mb-4 `}>
                        Recording
                    </h3>
                    <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                        <PlayCircle className="h-16 w-16 text-white/50" />
                    </div>
                    <div className="flex space-x-3">
                        <Button className="flex-1">
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Play Recording
                        </Button>
                        <Button variant="outline">Download</Button>
                    </div>
                </Card>

                {/* Transcription */}
                <Card className={`p-6 `}>
                    <h3 className={`mb-4 `}>
                        Transcription
                    </h3>
                    <div
                        className={`p-4 rounded-lg border mb-4 bg-gray-50 border-gray-200`}
                    >
                        <p className={`text-sm mb-2 text-gray-700`}>
                            <strong>Sarah Chen:</strong> Good morning everyone! Let&#39;s start with our standup...
                        </p>
                        <p className={`text-sm text-gray-700`}>
                            <strong>Michael Ross:</strong> Sure, I finished the client dashboard yesterday and...
                        </p>
                    </div>
                    <Button className="w-full" onClick={onViewTranscription}>
                        View Full Transcription
                    </Button>
                </Card>

                {/* Meeting Stats */}
                <Card className={`p-6 `}>
                    <h3 className={`mb-4 `}>
                        Meeting Stats
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
              <span className="text-gray-600">
                Duration
              </span>
                            <span className="text-gray-900">
                {meeting.duration}
              </span>
                        </div>
                        <div className="flex justify-between">
              <span className="text-gray-600">
                Participants
              </span>
                            <span className="text-gray-900">
                {meeting?.attendees?.length}
              </span>
                        </div>
                        <div className="flex justify-between">
              <span className="text-gray-600">
                Recording Size
              </span>
                            <span className="text-gray-900">
                124 MB
              </span>
                        </div>
                    </div>
                </Card>

                {/* Quick Actions */}
                <Card className={`p-6 `}>
                    <h3 className={`mb-4 `}>
                        Quick Actions
                    </h3>
                    <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                            <Link2 className="h-4 w-4 mr-2" />
                            Share Recording Link
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Transcription
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule Follow-up
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// Transcription View Component
function TranscriptionView({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
    const [searchQuery, setSearchQuery] = useState("");

    const transcript = [
        { speaker: "Sarah Chen", time: "00:00", text: "Good morning everyone! Let's start with our standup. Michael, would you like to go first?" },
        { speaker: "Michael Ross", time: "00:08", text: "Sure, thanks Sarah. Yesterday I completed the client dashboard redesign. The new layout is much cleaner and the performance has improved significantly." },
        { speaker: "Emma Wilson", time: "00:25", text: "That's great Michael! I reviewed the pull request this morning and it looks really good. Just left a few minor comments about the mobile responsive behavior." },
        { speaker: "Michael Ross", time: "00:35", text: "Thanks Emma, I'll address those today. My plan for today is to implement the feedback and then start working on the analytics integration." },
        { speaker: "Sarah Chen", time: "00:45", text: "Perfect. Emma, what about you?" },
        { speaker: "Emma Wilson", time: "00:48", text: "Yesterday I finished the API documentation for the v2 endpoints. Today I'm planning to work on the authentication flow improvements we discussed last week." },
    ];

    return (
        <div className={`p-6`}>
            <div className="flex items-center space-x-4 mb-6">
                <Button variant="ghost" onClick={onBack}>
                    ← Back to Summary
                </Button>
            </div>

            <div>
                <h1 className={`text-3xl `}>
                    Meeting Transcription
                </h1>
                <p className={`mt-1 text-gray-600`}>
                    {meeting.title} • {meeting.date}
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 mt-6">
                {/* Video Player */}
                <div className="lg:col-span-2">
                    <Card className={`p-6 `}>
                        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                            <PlayCircle className="h-16 w-16 text-white/50" />
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button size="sm">
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Play
                            </Button>
                            <div className="flex-1">
                                <div className={`h-2 rounded-full bg-gray-200`}>
                                    <div className="h-2 bg-blue-600 rounded-full" style={{ width: "35%" }}></div>
                                </div>
                            </div>
                            <span className={`text-sm text-gray-600`}>
                15:30 / 45:00
              </span>
                        </div>
                    </Card>
                </div>

                {/* Transcription Panel */}
                <div className="lg:col-span-1">
                    <Card className={`p-6  h-[calc(100vh-250px)]`}>
                        <div className="mb-4">
                            <Input
                                placeholder="Search transcript..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-4 overflow-y-auto h-[calc(100%-60px)]">
                            {transcript.map((entry, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50`}
                                >
                                    <div className="flex items-start space-x-3">
                    <span className={`text-xs text-gray-400 mt-1`}>
                      {entry.time}
                    </span>
                                        <div className="flex-1">
                                            <p className={`text-sm mb-1 "text-blue-600`}>
                                                {entry.speaker}
                                            </p>
                                            <p className={`text-sm text-gray-700`}>
                                                {entry.text}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
