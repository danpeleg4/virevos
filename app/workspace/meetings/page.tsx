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
    const [audioUrls, setAudioUrls] = useState<{url: string, key: string}[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null | string>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
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
                setVideoUrls(res.data.videoUrls || []);
                setAudioUrls(res.data.audioUrls || []);
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
        const videos = videoRefs.current.filter(v => v !== null);
        const audios = audioRefs.current.filter(a => a !== null);
        if (videos.length === 0 && audios.length === 0) return;

        // When any video plays, start all others and all audios
        const handlePlay = (e: Event) => {
            const master = e.target as HTMLMediaElement;
            const masterTime = master.currentTime;

            videos.forEach(v => {
                if (v !== master) {
                    if (masterTime < (v.duration || Infinity)) {
                        v.currentTime = masterTime;
                        v.play();
                    }
                }
            });
            audios.forEach(a => {
                if (a !== master) {
                    if (masterTime < (a.duration || Infinity)) {
                        a.currentTime = masterTime;
                        a.play();
                    }
                }
            });
        };

        // When any video pauses, pause all others and all audios
        const handlePause = () => {
            videos.forEach(v => v.pause());
            audios.forEach(a => a.pause());
        };

        // Keep all in sync with the first video (if present) or first audio
        const handleTimeUpdate = (e: Event) => {
            const master = e.target as HTMLMediaElement;
            // Only use the first video or first audio as the master for syncing others
            const primaryMaster = videos[0] || audios[0];
            if (master !== primaryMaster) return;

            const masterTime = master.currentTime;

            videos.forEach(v => {
                if (v !== master && !v.ended && Math.abs(masterTime - v.currentTime) > 0.3) {
                    v.currentTime = Math.min(masterTime, v.duration || masterTime);
                }
            });
            audios.forEach(a => {
                if (a !== master && !a.ended && Math.abs(masterTime - a.currentTime) > 0.3) {
                    a.currentTime = Math.min(masterTime, a.duration || masterTime);
                }
            });
        };

        videos.forEach(v => {
            v.addEventListener("play", handlePlay);
            v.addEventListener("pause", handlePause);
            v.addEventListener("timeupdate", handleTimeUpdate);
        });

        audios.forEach(a => {
            a.addEventListener("play", handlePlay);
            a.addEventListener("pause", handlePause);
            a.addEventListener("timeupdate", handleTimeUpdate);
        });

        return () => {
            videos.forEach(v => {
                v.removeEventListener("play", handlePlay);
                v.removeEventListener("pause", handlePause);
                v.removeEventListener("timeupdate", handleTimeUpdate);
            });
            audios.forEach(a => {
                a.removeEventListener("play", handlePlay);
                a.removeEventListener("pause", handlePause);
                a.removeEventListener("timeupdate", handleTimeUpdate);
            });
        };
    }, [videoUrls, audioUrls]);

    useEffect(() => {
        const videos = videoRefs.current.filter(v => v !== null);
        const audios = audioRefs.current.filter(a => a !== null);
        if (videos.length === 0 && audios.length === 0) return;

        const onTimeUpdate = (e: Event) => {
            const master = e.target as HTMLMediaElement;
            const primaryMaster = videos[0] || audios[0];
            if (master === primaryMaster) {
                setCurrentTime(master.currentTime);
            } else if ((primaryMaster.ended || primaryMaster.paused) && master.currentTime > currentTime) {
                // If primary master ended, let others update the clock
                setCurrentTime(master.currentTime);
            }
        };

        const onLoadedMetadata = (e: Event) => {
            const media = e.target as HTMLMediaElement;
            if (!isNaN(media.duration)) {
                setDuration(prev => Math.max(prev, media.duration));
            }
        };

        videos.forEach(v => {
            v.addEventListener("timeupdate", onTimeUpdate);
            v.addEventListener("loadedmetadata", onLoadedMetadata);
        });
        audios.forEach(a => {
            a.addEventListener("timeupdate", onTimeUpdate);
            a.addEventListener("loadedmetadata", onLoadedMetadata);
        });

        return () => {
            videos.forEach(v => {
                v.removeEventListener("timeupdate", onTimeUpdate);
                v.removeEventListener("loadedmetadata", onLoadedMetadata);
            });
            audios.forEach(a => {
                a.removeEventListener("timeupdate", onTimeUpdate);
                a.removeEventListener("loadedmetadata", onLoadedMetadata);
            });
        };
    }, [videoUrls, audioUrls, currentTime]);

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
        const videos = videoRefs.current.filter(v => v !== null);
        const audios = audioRefs.current.filter(a => a !== null);
        
        const checkAllEnded = () => {
            const allEnded = [...videos, ...audios].every(m => m.ended || m.paused);
            if (allEnded) setIsPlaying(false);
        };

        videos.forEach(v => v.addEventListener("ended", checkAllEnded));
        audios.forEach(a => a.addEventListener("ended", checkAllEnded));

        return () => {
            videos.forEach(v => v.removeEventListener("ended", checkAllEnded));
            audios.forEach(a => a.removeEventListener("ended", checkAllEnded));
        };
    }, [videoUrls, audioUrls]);

    useEffect(() => {
        const videos = videoRefs.current.filter(v => v !== null);
        const audios = audioRefs.current.filter(a => a !== null);

        const onPlay = () => setIsPlaying(true);
        const onPause = () => {
            const anyPlaying = [...videos, ...audios].some(m => !m.paused && !m.ended);
            if (!anyPlaying) setIsPlaying(false);
        }

        videos.forEach(v => {
            v.addEventListener("play", onPlay);
            v.addEventListener("pause", onPause);
        });
        audios.forEach(a => {
            a.addEventListener("play", onPlay);
            a.addEventListener("pause", onPause);
        });

        return () => {
            videos.forEach(v => {
                v.removeEventListener("play", onPlay);
                v.removeEventListener("pause", onPause);
            });
            audios.forEach(a => {
                a.removeEventListener("play", onPlay);
                a.removeEventListener("pause", onPause);
            });
        };
    }, [videoUrls, audioUrls]);

    const togglePlay = () => {
        const videos = videoRefs.current.filter(v => v !== null);
        const audios = audioRefs.current.filter(a => a !== null);
        const allMedia = [...videos, ...audios];
        
        if (allMedia.length === 0) return;

        const isAnyPlaying = allMedia.some(m => !m.paused && !m.ended);

        if (!isAnyPlaying) {
            allMedia.forEach(m => {
                if (currentTime < (m.duration || Infinity)) {
                    m.play();
                }
            });
            setIsPlaying(true);
        } else {
            allMedia.forEach(m => m.pause());
            setIsPlaying(false);
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

        videoRefs.current.forEach(v => {
            if (v) v.currentTime = Math.min(newTime, v.duration || newTime);
        });
        audioRefs.current.forEach(a => {
            if (a) a.currentTime = Math.min(newTime, a.duration || newTime);
        });

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
                {/* LEFT COLUMN: Video + Stats */}
                <div className="lg:col-span-2 flex flex-col min-h-0 gap-6">

                    {/* Video Card */}
                    <Card className="p-6 flex flex-col min-h-0 shadow-sm">
                        <div className="aspect-video relative bg-black rounded-lg overflow-hidden mb-4">
                            <div className={`grid h-full w-full ${
                                videoUrls.length > 2 ? 'grid-cols-2 grid-rows-2' : 
                                videoUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
                            }`}>
                                {videoUrls.length > 0 ? (
                                    videoUrls.map((video, idx) => (
                                        <div key={video.key} className={`relative bg-gray-900 overflow-hidden`}>
                                            <video
                                                ref={el => { videoRefs.current[idx] = el; }}
                                                src={video.url}
                                                className="w-full h-full object-contain"
                                                muted
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white">
                                        No video found
                                    </div>
                                )}
                            </div>
                            {audioUrls.map((audio, idx) => (
                                <audio key={audio.key} ref={el => { audioRefs.current[idx] = el; }} src={audio.url} />
                            ))}
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

                    {/* Stats & Actions Row */}
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="p-5 shadow-sm">
                            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500">Stats</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Duration</span>
                                    <span className="font-medium">{meeting.duration}m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Participants</span>
                                    <span className="font-medium">{meeting?.attendees?.length}</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-5 shadow-sm">
                            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500">Actions</h3>
                            <div className="flex flex-col gap-2">
                                <Button variant="outline" size="sm" className="justify-start">
                                    <Link2 className="h-4 w-4 mr-2" /> Share
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start">
                                    <Copy className="h-4 w-4 mr-2" /> Copy Transcript
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* RIGHT COLUMN: Transcription (Scrolls independently) */}
                <Card className="lg:col-span-1 flex flex-col shadow-sm border-l overflow-y-auto">
                    <CardContent className="flex-1 min-h-0 overflow-y-auto">
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