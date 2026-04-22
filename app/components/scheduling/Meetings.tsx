import React, { useEffect, useMemo, useRef, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
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
  CheckIcon,
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
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Live
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted/50 text-muted-foreground border border-border">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
      Ended
    </span>
  );
}

export function Meetings({ tabNav }: { tabNav?: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<
    "date" | "title" | "duration" | "participants"
  >("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "upcoming" | "ended"
  >("all");
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
      const reserved = 40 + 50 + 24;
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

  const filteredMeetings = (
    meetings?.data?.filter(
      (event) =>
        event.isMeeting &&
        (statusFilter === "all" || event.status === statusFilter) &&
        (!searchQuery ||
          decodeURIComponent(event.title)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    ) ?? []
  ).sort((a, b) => {
    let cmp = 0;
    if (sortField === "date") {
      cmp = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    } else if (sortField === "title") {
      cmp = decodeURIComponent(a.title).localeCompare(
        decodeURIComponent(b.title)
      );
    } else if (sortField === "duration") {
      cmp = (a.duration ?? 0) - (b.duration ?? 0);
    } else if (sortField === "participants") {
      cmp = (a.attendees?.length ?? 0) - (b.attendees?.length ?? 0);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

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
    <div ref={tableRef} className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 flex-wrap">
        {tabNav && (
          <div className="flex items-center gap-1 shrink-0 mr-2">{tabNav}</div>
        )}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
                <ArrowUpDown className="h-3 w-3" />
                Sort
                {sortField !== "date" || sortDir !== "desc" ? (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(
                [
                  { label: "Date (Newest)", field: "date", dir: "desc" },
                  { label: "Date (Oldest)", field: "date", dir: "asc" },
                  { label: "Title (A–Z)", field: "title", dir: "asc" },
                  { label: "Title (Z–A)", field: "title", dir: "desc" },
                  {
                    label: "Duration (Longest)",
                    field: "duration",
                    dir: "desc",
                  },
                  {
                    label: "Duration (Shortest)",
                    field: "duration",
                    dir: "asc",
                  },
                  {
                    label: "Participants (Most)",
                    field: "participants",
                    dir: "desc",
                  },
                  {
                    label: "Participants (Fewest)",
                    field: "participants",
                    dir: "asc",
                  },
                ] as const
              ).map(({ label, field, dir }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => {
                    setSortField(field);
                    setSortDir(dir);
                    setPage(1);
                  }}
                  className="flex items-center justify-between"
                >
                  {label}
                  {sortField === field && sortDir === dir && (
                    <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
                <SlidersHorizontal className="h-3 w-3" />
                Filter
                {statusFilter !== "all" ? (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {(
                [
                  { label: "All", value: "all" },
                  { label: "Live", value: "active" },
                  { label: "Upcoming", value: "upcoming" },
                  { label: "Ended", value: "ended" },
                ] as const
              ).map(({ label, value }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  className="flex items-center justify-between"
                >
                  {label}
                  {statusFilter === value && (
                    <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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

      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Video className="h-3.5 w-3.5" />
                  Meeting
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  Status
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  Date
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  Time
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Users className="h-3.5 w-3.5" />
                  Participants
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  Duration
                </div>
              </th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedMeetings.map((meeting) => (
              <tr
                key={meeting.id}
                className="hover:bg-muted/50 transition-colors group"
              >
                <td className="px-4 py-2.5">
                  <span className="text-sm font-medium text-foreground">
                    {decodeURIComponent(meeting.title)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={meeting.status} />
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {formatDateOnly(new Date(meeting.dateTime))}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {formatTimeOnly(new Date(meeting.dateTime))}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                    <Users className="h-3 w-3" />
                    {meeting?.attendees?.length ?? 0}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
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
                  <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border bg-muted/50">
        <div className="text-xs text-muted-foreground">
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
          <span className="px-2 py-1 text-xs text-muted-foreground">
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
                <div className="p-3 rounded-lg border bg-muted/50 border-border">
                  <p className="text-xs mb-2 text-muted-foreground">
                    Meeting Link
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground truncate flex-1">
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

function TranscriptionView({
  meeting,
  onBack,
}: {
  meeting: Event;
  onBack: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [formattedData, setFormattedData] = useState<TranscribedChunk[]>([]);
  const [videos, setVideos] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<
    number | null | string
  >(null);
  const primaryRef = useRef<HTMLVideoElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof currentChunkIndex !== "number") return;
    const container = containerRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    const activeElem = children[currentChunkIndex];
    if (activeElem) activeElem.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentChunkIndex]);

  useEffect(() => {
    const transcript = async () => {
      const res = await axios.get(`/api/transcript/${meeting.id}`);
      const { chunks: raw, meetingStartTimeEpoch }: { chunks: RawChunk[], meetingStartTimeEpoch: number } = res.data;
      if (!raw.length) return;

      const firstChunkMs = raw[0]?.createdAt ? new Date(raw[0].createdAt).getTime() : null;
      const epochAnchorMs = meetingStartTimeEpoch ? meetingStartTimeEpoch * 1000 : null;

      // Use meetingStartTimeEpoch if it's before the first chunk (valid data).
      // Fall back to first chunk's timestamp if the stored value is corrupted (in the future).
      const anchorMs =
        epochAnchorMs !== null && firstChunkMs !== null && epochAnchorMs <= firstChunkMs
          ? epochAnchorMs
          : firstChunkMs;

      const formatted: TranscribedChunk[] = raw.map((item, i) => {
        let startTimeSec: number;
        let endTimeSec: number;

        if (anchorMs !== null && item.createdAt) {
          startTimeSec = Math.max(
            0,
            (new Date(item.createdAt).getTime() - anchorMs) / 1000
          );
          const nextItem = raw[i + 1];
          const nextMs = nextItem?.createdAt
            ? new Date(nextItem.createdAt).getTime()
            : new Date(item.createdAt).getTime() + 5000;
          endTimeSec = Math.max(startTimeSec + 0.1, (nextMs - anchorMs) / 1000);
        } else {
          // Fallback when no timestamps: evenly space chunks at 5s intervals
          startTimeSec = i * 5;
          endTimeSec = (i + 1) * 5;
        }

        const m = Math.floor(startTimeSec / 60);
        const s = Math.floor(startTimeSec % 60);
        return {
          speaker: item.speaker,
          time: `${m}:${String(s).padStart(2, "0")}`,
          text: item.text,
          startTime: startTimeSec,
          endTime: endTimeSec,
        };
      });
      setFormattedData(formatted);
    };
    transcript();
  }, [meeting.id]);

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        const res = await axios.get(`/api/recording/${meeting.id}`);
        setVideos(res.data?.url ?? "");
      } catch (err) {
        console.error("Failed to fetch recording:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecording();
  }, [meeting.id]);

  // Track state from the primary (first) video
  useEffect(() => {
    const video = primaryRef.current;
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
  }, [videos]);

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

  const allVideos = () =>
    videoRefs.current.filter((v): v is HTMLVideoElement => v !== null);

  const togglePlay = () => {
    const primary = primaryRef.current;
    if (!primary) return;
    if (primary.paused || primary.ended) {
      allVideos().forEach((v) => v.play());
    } else {
      allVideos().forEach((v) => v.pause());
    }
  };

  const formatClock = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const SPEAKER_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
  ];

  const speakerColors = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const chunk of formattedData) {
      if (!map.has(chunk.speaker)) {
        map.set(chunk.speaker, SPEAKER_COLORS[i % SPEAKER_COLORS.length]);
        i++;
      }
    }
    return map;
  }, [formattedData]);

  const progressPercent =
    duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(clickX / rect.width, 1));
    const newTime = percent * duration;
    allVideos().forEach((v) => {
      v.currentTime = newTime;
    });
    setCurrentTime(newTime);
  };

  if (loading) return <p>Loading recording...</p>;

  return (
    <div className="h-full min-h-0 flex flex-col p-6 bg-card overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="h-5 w-px bg-border" />
        <div>
          <h1 className="text-xl font-semibold leading-tight text-foreground">
            {decodeURIComponent(meeting.title)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDateOnly(new Date(meeting.dateTime))} at{" "}
            {formatTimeOnly(new Date(meeting.dateTime))}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto">
        <div className="lg:col-span-2 flex flex-col min-h-0 gap-6">
          <Card className="p-6 flex flex-col min-h-0 shadow-sm">
            <div
              className={`relative bg-black rounded-lg overflow-hidden mb-4`}
            >
              <div>
                {videos ? (
                  <div className="relative aspect-video">
                    <video
                      ref={(el) => {
                        videoRefs.current[0] = el;
                        primaryRef.current = el;
                      }}
                      src={videos}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center text-white/60 text-sm">
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
                  className="relative h-2 rounded-full bg-muted cursor-pointer overflow-hidden"
                  onClick={onSeek}
                >
                  {duration > 0 &&
                    formattedData.map((chunk, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full"
                        style={{
                          left: `${(chunk.startTime / duration) * 100}%`,
                          width: `${Math.max(0.3, ((chunk.endTime - chunk.startTime) / duration) * 100)}%`,
                          backgroundColor: speakerColors.get(chunk.speaker),
                          opacity: 0.85,
                        }}
                      />
                    ))}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white/90 shadow"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                {formatClock(currentTime)} / {formatClock(duration)}
              </span>
            </div>
            {speakerColors.size > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {Array.from(speakerColors.entries()).map(([speaker, color]) => (
                  <div key={speaker} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {speaker}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="lg:col-span-1 flex flex-col shadow-sm border-l overflow-y-auto">
          <CardContent className="flex-1 min-h-0 p-0 overflow-y-auto">
            <div className="p-4 border-b bg-muted/50">
              <Input
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-card"
              />
            </div>
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
              ref={containerRef}
            >
              {formattedData.length > 0 ? (
                (() => {
                  const q = searchQuery.toLowerCase();
                  const filtered = q
                    ? formattedData.filter(
                        (e) =>
                          e.text.toLowerCase().includes(q) ||
                          e.speaker.toLowerCase().includes(q)
                      )
                    : formattedData;

                  if (filtered.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
                        No results for &quot;{searchQuery}&quot;
                      </div>
                    );
                  }

                  return filtered.map((entry, index) => {
                    const originalIndex = formattedData.indexOf(entry);
                    const isActive = !q && originalIndex === currentChunkIndex;
                    const color = speakerColors.get(entry.speaker);

                    const highlight = (text: string) => {
                      if (!q) return <>{text}</>;
                      const parts = text.split(
                        new RegExp(
                          `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                          "gi"
                        )
                      );
                      return (
                        <>
                          {parts.map((part, i) =>
                            part.toLowerCase() === q ? (
                              <mark
                                key={i}
                                className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5"
                              >
                                {part}
                              </mark>
                            ) : (
                              part
                            )
                          )}
                        </>
                      );
                    };

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-xl transition-all duration-200 border shadow-sm ${
                          isActive
                            ? "border-transparent"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                        style={
                          isActive
                            ? {
                                backgroundColor: `${color}18`,
                                borderColor: `${color}40`,
                              }
                            : undefined
                        }
                      >
                        <div className="flex gap-3">
                          <span className="text-[10px] font-mono text-muted-foreground mt-1 tabular-nums">
                            {entry.time}
                          </span>
                          <div>
                            <p
                              className="text-xs font-bold mb-0.5"
                              style={{ color }}
                            >
                              {entry.speaker}
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {highlight(entry.text)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
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
