import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { CardContent, Card } from "../../components/ui/card";
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
  Calendar,
  Clock,
  Users,
  Copy,
  Check,
  PlayCircle,
  Pause,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Event, RawChunk, TranscribedChunk } from "@/types/meeting";
import { createInstantMeeting } from "@/lib/meetings";
import { formatDateOnly, formatTimeOnly } from "@/lib/date_utils";

const ROW_HEIGHT = 48;

function StatusBadge({ status }: { status: string | undefined }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-red-50 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Live
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-gray-50 text-gray-500 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      Ended
    </span>
  );
}

export function Meetings({ tabNav }: { tabNav?: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [meetingName, setMeetingName] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<"home" | "summary">("home");
  const [selectedMeeting, setSelectedMeeting] = useState<Event | null>(null);
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const tableRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const calculate = () => {
      if (!tableRef.current) return;
      const tableTop = tableRef.current.getBoundingClientRect().top;
      const reserved = 40 + 50 + 50 + 24;
      const available = window.innerHeight - tableTop - reserved;
      setItemsPerPage(Math.max(1, Math.floor(available / ROW_HEIGHT)));
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
      return data;
    },
  });

  const createMeeting = useMutation({
    mutationFn: async () => createInstantMeeting(meetingName),
    onSuccess: (data) => {
      if (!data?.id || !data?.link) return;
      setMeetingLink(data.link);
      setCreatedMeetingId(data.id);
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewSummary = (meeting: Event) => {
    setSelectedMeeting(meeting);
    setActiveView("summary");
  };

  const handleJoinMeeting = (meeting: Event) => {
    if (!meeting.link) return;
    if (meeting.link.includes("/meet/")) {
      const url = new URL(meeting.link);
      router.push(url.pathname);
      return;
    }
    window.open(meeting.link, "_blank", "noopener,noreferrer");
  };

  if (activeView === "summary") {
    return (
      <TranscriptionView
        meeting={selectedMeeting!}
        onBack={() => setActiveView("home")}
      />
    );
  }

  const filteredMeetings =
    meetings?.data?.filter(
      (event) =>
        event.isMeeting &&
        (!searchQuery ||
          decodeURIComponent(event.title)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    ) ?? [];

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMeetings.length / itemsPerPage)
  );
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedMeetings = filteredMeetings.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  return (
    <div ref={tableRef}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex-wrap">
        {tabNav && (
          <div className="flex items-center gap-1 shrink-0 mr-2">
            {tabNav}
          </div>
        )}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
            <ArrowUpDown className="h-3 w-3" />
            Sort
          </button>
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
            <SlidersHorizontal className="h-3 w-3" />
            Filter
          </button>
          <Button
            size="sm"
            className="h-8"
            onClick={() => setStartModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Meeting
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Video className="h-3.5 w-3.5" />
                  Meeting
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  Status
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  Date
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  Time
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Users className="h-3.5 w-3.5" />
                  Participants
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  Duration
                </div>
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedMeetings.map((meeting) => (
              <tr
                key={meeting.id}
                className="hover:bg-gray-50 transition-colors group"
              >
                <td className="px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-900">
                    {decodeURIComponent(meeting.title)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={meeting.status} />
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {formatDateOnly(new Date(meeting.dateTime))}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {formatTimeOnly(new Date(meeting.dateTime))}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                    <Users className="h-3 w-3" />
                    {meeting?.attendees?.length ?? 0}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {meeting.duration ? `${meeting.duration}m` : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {meeting.status === "active" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleJoinMeeting(meeting)}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Join Now
                      </Button>
                    )}
                    {meeting.status === "ended" && meeting.hasTranscript && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleViewSummary(meeting)}
                      >
                        <PlayCircle className="h-3 w-3 mr-1" />
                        Recording
                      </Button>
                    )}
                    {meeting.status === "upcoming" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredMeetings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    {searchQuery
                      ? "No meetings match your search"
                      : "No meetings found"}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50/50">
        <div className="text-xs text-gray-500">
          Showing {filteredMeetings.length === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + itemsPerPage, filteredMeetings.length)} of{" "}
          {filteredMeetings.length} meetings
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-7 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Previous
          </Button>
          <span className="px-2 py-1 text-xs text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-7 text-xs"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
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
                onClick={() => createMeeting.mutate()}
                disabled={!meetingName || createMeeting.isPending}
              >
                Start Meeting
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                  <p className="text-xs mb-2 text-gray-600">Meeting Link</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 truncate flex-1">
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
                    if (createdMeetingId)
                      router.push(`/meet/${createdMeetingId}`);
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

// Transcription View — unchanged
function TranscriptionView({
  meeting,
  onBack,
}: {
  meeting: Event;
  onBack: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [formattedData, setFormattedData] = useState<TranscribedChunk[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<
    number | null | string
  >(null);
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
    if (activeElem)
      activeElem.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentChunkIndex]);

  useEffect(() => {
    const fn = async () => {
      const res = await axios.get(`/api/transcript/${meeting.id}`);
      const formatted = res.data[0].map((item: RawChunk) => ({
        speaker: item.speaker,
        time: formatTime(item.start_time),
        text: item.chunk_text,
        startTime: item.start_time,
      }));
      setFormattedData(formatted);
    };
    fn();
  }, [meeting.id]);

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const res = await axios.get(`/api/recording/${meeting.id}`);
        setVideoUrl(res.data.url ?? null);
      } catch (err) {
        console.error("Failed to fetch recording:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecording();
  }, [meeting.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      if (!isNaN(video.duration)) setDuration(video.duration);
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
  }, [videoUrl]);

  useEffect(() => {
    if (!formattedData.length) return;
    const index = formattedData.findIndex(
      (chunk, i) =>
        currentTime >= chunk.startTime &&
        (i === formattedData.length - 1 ||
          currentTime < formattedData[i + 1].startTime)
    );
    setCurrentChunkIndex(index !== -1 ? index : null);
  }, [currentTime, formattedData]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play();
    else video.pause();
  };

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const progressPercent =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(clickX / rect.width, 1));
    const newTime = percent * duration;
    if (videoRef.current) videoRef.current.currentTime = newTime;
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
        <h1 className="text-3xl">Meeting Transcription</h1>
        <p className="mb-4 text-gray-600">
          {decodeURIComponent(meeting.title)} •{" "}
          {new Date(meeting.dateTime).toLocaleString()}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto">
        <div className="lg:col-span-2 flex flex-col min-h-0 gap-6">
          <Card className="p-6 flex flex-col min-h-0 shadow-sm">
            <div className="aspect-video relative bg-black rounded-lg overflow-hidden mb-4">
              <div className="h-full w-full">
                {videoUrl ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white">
                    No video found
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button size="sm" onClick={togglePlay} className="shrink-0">
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                {isPlaying ? "Pause" : "Play"}
              </Button>
              <div className="flex-1">
                <div
                  className="h-2 rounded-full bg-gray-100 cursor-pointer"
                  onClick={onSeek}
                >
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
                      className={`p-3 rounded-xl transition-all duration-200 border border-transparent ${
                        isActive
                          ? "bg-blue-50 border-blue-100 shadow-sm"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className="text-[10px] font-mono text-gray-400 mt-1 tabular-nums">
                          {entry.time}
                        </span>
                        <div>
                          <p
                            className={`text-xs font-bold mb-0.5 ${isActive ? "text-blue-600" : "text-gray-900"}`}
                          >
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
