"use client"

import React, {useEffect, useRef, useState} from "react";
import { Button } from "../../components/ui/button";
import {Card, CardContent} from "../../components/ui/card";
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
    PlayCircle, Pause,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {useMutation, useQuery} from "@tanstack/react-query";
import axios from "axios";
import { Meeting } from "@/types/meeting";
import {createRoom} from "@/lib/server_actions/meetings";

export default function Meetings() {
    const [startModalOpen, setStartModalOpen] = useState(false);
    const [joinModalOpen, setJoinModalOpen] = useState(false);
    const [meetingName, setMeetingName] = useState("");
    const [meetingLink, setMeetingLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [activeView, setActiveView] = useState<"home" | "in-meeting" | "summary" | "transcription">("home");
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const router = useRouter();

    const s = crypto.randomUUID()
    const meetingURL = `${meetingName}-${s.slice(0, Math.floor(s.length / 2))}`
    const nameOfMeeting = meetingURL.split("-")[0];

    const meetings = useQuery({
        queryKey: ["meetings"],
        queryFn: async () => {
            const res = await axios.get("/api/meetings");
            const data: Meeting[] = res.data;
            return data.map(m => ({
                ...m,
                attendees: m.attendees ?? [],
            }));
        }
    })

    const createMeeting = useMutation({
        mutationFn: async () => {
            const res = await createRoom(nameOfMeeting);
            return res
        }
    })

    const handleStartMeeting = () => {
        const link = `https://virevos.com/meet/${meetingURL}`;
        setMeetingLink(link);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(meetingLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleViewSummary = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setActiveView("summary");
    };

    if (activeView === "summary") {
        return <TranscriptionView meeting={selectedMeeting!} onBack={() => setActiveView("home")} />;
    }

    const color = (meeting: Meeting) => {
        switch (meeting.status){
            case "active":
                return "text-red-600"
            case "upcoming":
                return "text-blue-600"
            default:
                return "text-gray-600"
        }
    }

    const bgColor = (meeting: Meeting) => {
        switch (meeting.status) {
            case "active":
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
                                                    {decodeURIComponent(meeting.title)}
                                                </h3>
                                                <Badge
                                                    className={
                                                        meeting.status === "active"
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
                                                    <span>• Duration: {meeting.duration}m</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {meeting.status === "active" && (
                                            <Button onClick={() => handleStartMeeting()}>
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
                            Configure your meeting name before starting
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
                                        createMeeting.mutate()
                                        router.push(`/meet/${meetingURL}`);
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

type RawChunk = {
    id: string;
    chunk_text: string;
    speaker: string;
    start_time: number;
    end_time: number;
    room: string;
};

type TranscribedChunk = {
    speaker: string;
    time: string;
    text: string;
    startTime: number;
};

// Transcription View Component
function TranscriptionView({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [formattedData, setFormattedData] = useState<TranscribedChunk[]>([]);
    const [videoUrls, setVideoUrls] = useState<{url: string, key: string}[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null | string>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    useEffect(() => {
        if (typeof currentChunkIndex !== "number") return;

        const container = containerRef.current;
        if (!container) return;

        const children = Array.from(container.children) as HTMLElement[];
        const activeElem = children[currentChunkIndex];

        if (activeElem) {
            activeElem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [currentChunkIndex]);

    useEffect(() => {
        const fn = async () => {
            const res = await axios.post(`/api/transcript`, {
                meetingId: meeting.title,
            });

            const formatted = res.data[0].map((item: RawChunk) => ({
                speaker: item.speaker,
                time: formatTime((item.start_time)),
                text: item.chunk_text,
                startTime: item.start_time,
            }));
            console.log(formatted);
            setFormattedData(formatted);
        }
        fn();
    }, [meeting.title]);

    // Fetch signed URLs from API
    useEffect(() => {
        const fetchRecording = async () => {
            try {
                const res = await axios.post(`/api/recording`, {
                    meetingId: meeting.title
                });
                setVideoUrls(res.data.videoUrls || []);
            } catch (err) {
                console.error("Failed to fetch recording:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecording();
    }, [meeting.title]);

    // Sync video playback
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => {
            if (!isNaN(video.duration)) {
                setDuration(video.duration);
            }
        };

        video.addEventListener("play", handlePlay);
        video.addEventListener("pause", handlePause);
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);

        return () => {
            video.removeEventListener("play", handlePlay);
            video.removeEventListener("pause", handlePause);
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
    }, [videoUrls]);

    useEffect(() => {
        if (!formattedData.length) return;

        const index = formattedData.findIndex(
            (chunk, i) =>
                currentTime >= chunk.startTime && // numeric seconds
                (i === formattedData.length - 1 || currentTime < formattedData[i + 1].startTime)
        );

        setCurrentChunkIndex(index !== -1 ? index : null);
    }, [currentTime, formattedData]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused || video.ended) {
            video.play();
        } else {
            video.pause();
        }
    };

    const formatClock = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    const progressPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
    const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(clickX / rect.width, 1));
        const newTime = percent * duration;

        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }

        setCurrentTime(newTime);
    };

    if (loading) return <p>Loading recording...</p>;

    return (
        <div className="h-full min-h-0 flex flex-col p-6 bg-white overflow-hidden">
            <div className="flex items-center space-x-4 mb-2">
                <Button variant="ghost" onClick={onBack}>
                    ← Back to Summary
                </Button>
            </div>

            <div>
                <h1 className="text-3xl">
                    Meeting Transcription
                </h1>
                <p className="mb-4 text-gray-600">
                    {decodeURIComponent(meeting.title)} • {meeting.date}
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto">
                {/* LEFT COLUMN: Video */}
                <div className="lg:col-span-2 flex flex-col min-h-0 gap-6">

                    {/* Video Card */}
                    <Card className="p-6 flex flex-col min-h-0 shadow-sm">
                        <div className="aspect-video relative bg-black rounded-lg overflow-hidden mb-4">
                            <div className="h-full w-full">
                                {videoUrls.length > 0 ? (
                                    <video
                                        ref={videoRef}
                                        src={videoUrls[0].url}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white">
                                        No video found
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Video Controls */}
                        <div className="flex items-center space-x-4">
                            <Button size="sm" onClick={togglePlay} className="shrink-0">
                                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                                {isPlaying ? "Pause" : "Play"}
                            </Button>
                            <div className="flex-1">
                                <div className="h-2 rounded-full bg-gray-100 cursor-pointer" onClick={onSeek}>
                                    <div
                                        className="h-2 bg-blue-600 rounded-full transition-all"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                            <span className="text-sm font-mono text-gray-500 tabular-nums">
                                {formatClock(currentTime)} / {formatClock(duration)}
                            </span>
                        </div>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Transcription (Scrolls independently) */}
                <Card className="lg:col-span-1 flex flex-col shadow-sm border-l overflow-y-auto">
                    <CardContent className="flex-1 min-h-0 p-0 overflow-y-auto">
                    <div className="p-4 border-b bg-gray-50/50">
                        <Input
                            placeholder="Search transcript..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div
                        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
                        ref={containerRef}
                    >
                        {formattedData.length > 0 ? (
                            formattedData.map((entry, index) => {
                                const isActive = index === currentChunkIndex;
                                return (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-xl transition-all duration-200 border border-transparent 
                                            ${isActive ? 'bg-blue-50 border-blue-100 shadow-sm' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-[10px] font-mono text-gray-400 mt-1 tabular-nums">
                                                {entry.time}
                                            </span>
                                            <div>
                                                <p className={`text-xs font-bold mb-0.5 ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                                                    {entry.speaker}
                                                </p>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {entry.text}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
                                Loading transcript segments...
                            </div>
                        )}
                    </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}