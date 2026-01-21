"use client"

import React, {useEffect, useRef, useState} from "react";
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
    PlayCircle, Pause,
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
            return data.map(m => ({
                ...m,
                attendees: m.attendees ?? [],
            }));
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
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null | string>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    function formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    useEffect(() => {
        if (currentChunkIndex === null) return;
        const container = containerRef.current;
        if (!container) return;
        const activeElem = container.children[currentChunkIndex] as HTMLElement;
        if (activeElem) {
            activeElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentChunkIndex]);

    useEffect(() => {
        const fn = async () => {
            const res = await axios.post(`/api/transcript`, {
                meetingName: meeting.title,
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
                setVideoUrl(res.data.videoUrl || null);
                setAudioUrl(res.data.audioUrl || null);
            } catch (err) {
                console.error("Failed to fetch recording:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecording();
    }, [meeting.title]);

    // Sync video and audio playback
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        // When video plays, start audio
        const handlePlay = () => {
            audio.currentTime = video.currentTime;
            audio.play();
        };

        // When video pauses, pause audio
        const handlePause = () => {
            audio.pause();
        };

        // Keep audio time in sync with video
        const handleTimeUpdate = () => {
            if (Math.abs(video.currentTime - audio.currentTime) > 0.3) {
                audio.currentTime = video.currentTime;
            }
        };

        video.addEventListener("play", handlePlay);
        video.addEventListener("pause", handlePause);
        video.addEventListener("timeupdate", handleTimeUpdate);

        return () => {
            video.removeEventListener("play", handlePlay);
            video.removeEventListener("pause", handlePause);
            video.removeEventListener("timeupdate", handleTimeUpdate);
        };
    }, [videoUrl, audioUrl]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const onLoadedMetadata = () => {
            if (!isNaN(video.duration)) {
                setDuration(video.duration);
            }
        };

        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("loadedmetadata", onLoadedMetadata);

        return () => {
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
        };
    }, [videoUrl]);

    useEffect(() => {
        if (!formattedData.length) return;

        const index = formattedData.findIndex(
            (chunk, i) =>
                currentTime >= chunk.startTime && // numeric seconds
                (i === formattedData.length - 1 || currentTime < formattedData[i + 1].startTime)
        );

        setCurrentChunkIndex(index !== -1 ? index : null);
    }, [currentTime, formattedData]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onEnded = () => setIsPlaying(false);

        video.addEventListener("ended", onEnded);
        return () => video.removeEventListener("ended", onEnded);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);

        return () => {
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
        };
    }, [videoUrl]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    const formatClock = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const bar = e.currentTarget;
        const rect = bar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        const newTime = percent * duration;

        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }

        setCurrentTime(newTime);
    };

    if (loading) return <p>Loading recording...</p>;

    return (
        <div className="h-screen overflow-hidden flex flex-col p-6">
        <div className="flex items-center space-x-4 mb-6">
                <Button variant="ghost" onClick={onBack}>
                    ← Back to Summary
                </Button>
            </div>

            <div>
                <h1 className="text-3xl">
                    Meeting Transcription
                </h1>
                <p className="mt-1 text-gray-600">
                    {meeting.title} • {meeting.date}
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 mt-6 flex-1 min-h-0">
            {/* Video Player */}
                <div className="lg:col-span-2">
                    <Card className="p-6 flex-1 flex flex-col">
                            {videoUrl ? (
                                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4 flex-1">
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        className="w-full h-full rounded-lg bg-black"
                                        controls={false}
                                        muted
                                    />
                                    {audioUrl && <audio ref={audioRef} src={audioUrl} />}
                                </div>
                            ) : (
                                <p>No video available</p>
                            )}
                        <div className="flex items-center space-x-4">
                            <Button size="sm" onClick={togglePlay}>
                                {isPlaying ? (
                                    <>
                                        <Pause className="h-4 w-4 mr-2" />
                                        Pause
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Play
                                    </>
                                )}
                            </Button>
                            <div className="flex-1">
                                <div
                                    className="h-2 rounded-full bg-gray-200 cursor-pointer"
                                    onClick={onSeek}
                                >
                                    <div
                                        className="h-2 bg-blue-600 rounded-full transition-all"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                            <span className={`text-sm text-gray-600`}>
                                {formatClock(currentTime)} / {formatClock(duration)}
                            </span>
                        </div>
                    </Card>

                 {/* Meeting Stats & Quick Actions */}
                 <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="lg:col-span-1">
                        <Card className={`p-6 h-full min-h-50`}>
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
                    </div>

                    {/* Quick Actions */}
                    <div className="lg:col-span-1">
                        <Card className={`p-6 h-full min-h-50`}>
                            <h3 className={`mb-4`}>
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
                </div>

                {/* Transcription Panel */}
                <div className="lg:col-span-1 lg:row-span-2 min-h-0">
                    <Card className="p-6 flex flex-col flex-1 min-h-0">
                    <div className="mb-4">
                            <Input
                                placeholder="Search transcript..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div
                            className="space-y-4 overflow-y-auto flex-1"
                            ref={containerRef}
                        >
                            {formattedData.length > 0 ? (
                                formattedData.map((entry, index) => {
                                    const isActive = index === currentChunkIndex;
                                    return (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors
                                                ${isActive ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-start space-x-3">
                                                <span className="text-xs text-gray-400 mt-1">
                                                    {entry.time}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm mb-1 text-blue-600">
                                                        {entry.speaker}
                                                    </p>
                                                    <p className="text-sm text-gray-700">
                                                        {entry.text}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-400 text-sm">
                                    Loading transcript...
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
