"use client"

import { useState } from "react";
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
    VideoOff,
    Mic,
    MicOff,
    PlayCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface Meeting {
    id: number;
    name: string;
    date: string;
    time: string;
    status: "upcoming" | "live" | "ended";
    participants: number;
    duration?: string;
    hasRecording?: boolean;
}

const mockMeetings: Meeting[] = [
    {
        id: 1,
        name: "Weekly Team Standup",
        date: "Jan 6, 2026",
        time: "10:00 AM",
        status: "live",
        participants: 8,
    },
    {
        id: 2,
        name: "Client Demo - TechCorp",
        date: "Jan 6, 2026",
        time: "2:00 PM",
        status: "upcoming",
        participants: 4,
    },
    {
        id: 3,
        name: "Design Review Session",
        date: "Jan 7, 2026",
        time: "11:00 AM",
        status: "upcoming",
        participants: 6,
    },
    {
        id: 4,
        name: "Project Kickoff - StartupXYZ",
        date: "Jan 5, 2026",
        time: "3:00 PM",
        status: "ended",
        participants: 5,
        duration: "45 min",
        hasRecording: true,
    },
    {
        id: 5,
        name: "Monthly All-Hands",
        date: "Jan 4, 2026",
        time: "9:00 AM",
        status: "ended",
        participants: 25,
        duration: "1h 15min",
        hasRecording: true,
    },
];

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

    const handleStartMeeting = () => {
        const link = `https://meet.flowtask.com/${Math.random().toString(36).substr(2, 9)}`;
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

    if (activeView === "in-meeting") {
        return <InMeetingView meeting={selectedMeeting!} onLeave={() => setActiveView("home")} onEndMeeting={() => setActiveView("summary")} />;
    }

    if (activeView === "summary") {
        return <MeetingSummary meeting={selectedMeeting!} onBack={() => setActiveView("home")} onViewTranscription={handleViewTranscription} />;
    }

    if (activeView === "transcription") {
        return <TranscriptionView meeting={selectedMeeting!} onBack={() => setActiveView("summary")} />;
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
                    <Button
                        variant="outline"
                        onClick={() => setJoinModalOpen(true)}
                    >
                        <Link2 className="h-4 w-4 mr-2" />
                        Join with Link
                    </Button>
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
                                {mockMeetings.filter((m) => m.status === "live").length}
                            </p>
                        </div>
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
                                {mockMeetings.filter((m) => m.status === "upcoming").length}
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
                            <p className={`text-2xl mt-1 `}>
                                {mockMeetings.filter((m) => m.hasRecording).length}
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
                    {mockMeetings.map((meeting) => (
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
                                            className={`p-3 rounded-lg ${
                                                meeting.status === "live"
                                                    ? "bg-red-100"
                                                    : "bg-gray-100"
                                            }`}
                                        >
                                            <Video
                                                className={`h-5 w-5 ${
                                                    meeting.status === "live"
                                                        ? "text-red-600"
                                                        : "text-gray-600"
                                                }`}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <h3
                                                    className={`text-gray-900`}
                                                >
                                                    {meeting.name}
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
                                                    <span>{meeting.participants} participants</span>
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
                                        {meeting.status === "ended" && meeting.hasRecording && (
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

                        <div className="space-y-3">
                            <Label>Settings</Label>
                            <div
                                className={`flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200`}
                            >
                                <div className="flex items-center space-x-3">
                                    {cameraOn ? (
                                        <Video className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <VideoOff className="h-5 w-5 text-gray-400" />
                                    )}
                                    <div>
                                        <p
                                            className={`text-sm text-gray-900`}
                                        >
                                            Camera
                                        </p>
                                        <p
                                            className={`text-xs text-gray-500`}
                                        >
                                            {cameraOn ? "On" : "Off"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCameraOn(!cameraOn)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        cameraOn ? "bg-blue-600" : "bg-gray-300"
                                    }`}
                                >
                  <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          cameraOn ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                                </button>
                            </div>

                            <div
                                className={`flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200`}
                            >
                                <div className="flex items-center space-x-3">
                                    {micOn ? (
                                        <Mic className="h-5 w-5 text-blue-600" />
                                    ) : (
                                        <MicOff className="h-5 w-5 text-gray-400" />
                                    )}
                                    <div>
                                        <p
                                            className={`text-sm text-gray-900`}
                                        >
                                            Microphone
                                        </p>
                                        <p
                                            className={`text-xs text-gray-500`}
                                        >
                                            {micOn ? "On" : "Off"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMicOn(!micOn)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        micOn ? "bg-blue-600" : "bg-gray-300"
                                    }`}
                                >
                  <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          micOn ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                                </button>
                            </div>
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
                                        handleJoinMeeting(mockMeetings[0]);
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
                                placeholder="https://meet.flowtask.com/abc123xyz"
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

// In-Meeting View Component
function InMeetingView({ meeting, onLeave, onEndMeeting }: { meeting: Meeting; onLeave: () => void; onEndMeeting: () => void }) {
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [copied, setCopied] = useState(false);

    const participants = [
        { id: 1, name: "You", avatar: "YO", isMuted: isMuted, cameraOff: isCameraOff },
        { id: 2, name: "Sarah Chen", avatar: "SC", isMuted: false, cameraOff: false },
        { id: 3, name: "Michael Ross", avatar: "MR", isMuted: true, cameraOff: false },
        { id: 4, name: "Emma Wilson", avatar: "EW", isMuted: false, cameraOff: false },
    ];

    const handleCopyLink = () => {
        navigator.clipboard.writeText("https://meet.flowtask.com/abc123xyz");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`fixed inset-0 bg-gray-900 flex flex-col z-50`}>
            {/* Recording Indicator */}
            {isRecording && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-red-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-sm">Recording • {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                    </div>
                </div>
            )}

            {/* Meeting Name */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                    <p className="text-sm">{meeting.name}</p>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-6 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 max-w-6xl w-full">
                    {participants.map((participant) => (
                        <motion.div
                            key={participant.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden"
                        >
                            {participant.cameraOff ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <span className="text-2xl text-gray-300">{participant.avatar}</span>
                                        </div>
                                        <p className="text-white">{participant.name}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <span className="text-2xl text-white">{participant.avatar}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Participant Name */}
                            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm flex items-center space-x-2">
                                <span>{participant.name}</span>
                                {participant.isMuted && (
                                    <MicOff className="h-3 w-3 text-red-400" />
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Control Bar */}
            <div className="p-6 flex justify-center">
                <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center space-x-3">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-4 rounded-full transition-colors ${
                            isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                        {isMuted ? (
                            <MicOff className="h-5 w-5 text-white" />
                        ) : (
                            <Mic className="h-5 w-5 text-white" />
                        )}
                    </button>

                    <button
                        onClick={() => setIsCameraOff(!isCameraOff)}
                        className={`p-4 rounded-full transition-colors ${
                            isCameraOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                        {isCameraOff ? (
                            <VideoOff className="h-5 w-5 text-white" />
                        ) : (
                            <Video className="h-5 w-5 text-white" />
                        )}
                    </button>

                    <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>

                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={`p-4 rounded-full transition-colors ${
                            isRecording ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                        <div className={`h-5 w-5 rounded ${isRecording ? "bg-white" : "bg-red-600"}`}></div>
                    </button>

                    <button
                        onClick={handleCopyLink}
                        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                        {copied ? (
                            <Check className="h-5 w-5 text-green-400" />
                        ) : (
                            <Users className="h-5 w-5 text-white" />
                        )}
                    </button>

                    <button
                        onClick={() => setShowLeaveConfirm(true)}
                        className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors ml-3"
                    >
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Leave Confirmation */}
            <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Leave Meeting?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to leave this meeting?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-3 mt-4">
                        <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setShowLeaveConfirm(false);
                                onEndMeeting();
                            }}
                        >
                            Leave Meeting
                        </Button>
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
                    {meeting.name}
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
                {meeting.participants}
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
                    {meeting.name} • {meeting.date}
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
