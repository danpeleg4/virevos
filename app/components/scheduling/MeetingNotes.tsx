import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { addProjectTasksAction } from "@/lib/tasks";
import { markActionItemAdded } from "@/lib/meetings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  FileText,
  Mic,
  Search,
  Calendar,
  CheckSquare,
  Sparkles,
  Clock,
  Users,
  Tag,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  CheckIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Event, RawChunk, TranscribedChunk } from "@/types/meeting";
import { formatDateOnly, formatTimeOnly } from "@/lib/date_utils";
import { Separator } from "../ui/separator";

const ROW_HEIGHT = 52;

export function MeetingNotes({ tabNav }: { tabNav?: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<
    "date" | "title" | "duration" | "attendees"
  >("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedNote, setSelectedNote] = useState<Event | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingItems, setAddingItems] = useState<Set<number>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [transcriptData, setTranscriptData] = useState<TranscribedChunk[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
      const meeting = data.map((m) => ({ ...m, attendees: m.attendees ?? [] }));
      return meeting.filter((filter) => filter.hasNotes !== false);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    if (!detailsOpen || !selectedNote?.hasTranscript) return;
    const fn = async () => {
      setTranscriptLoading(true);
      setTranscriptData([]);
      try {
        const res = await axios.get(`/api/transcript/${selectedNote.id}`);
        const { chunks }: { chunks: RawChunk[] } = res.data;
        const formatted = chunks.map((item: RawChunk) => ({
          speaker: item.speaker,
          time: item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString()
            : "",
          text: item.text,
          startTime: 0,
          endTime: 0,
        }));
        setTranscriptData(formatted);
      } finally {
        setTranscriptLoading(false);
      }
    };
    fn();
  }, [detailsOpen, selectedNote?.hasTranscript]);

  const filteredNotes = (
    meetings?.data?.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note?.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "with-transcript" && note.hasTranscript);
      return matchesSearch && matchesFilter;
    }) ?? []
  ).sort((a, b) => {
    let cmp = 0;
    if (sortField === "date")
      cmp = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    else if (sortField === "title") cmp = a.title.localeCompare(b.title);
    else if (sortField === "duration")
      cmp = (a.duration ?? 0) - (b.duration ?? 0);
    else if (sortField === "attendees")
      cmp = (a.attendees?.length ?? 0) - (b.attendees?.length ?? 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotes.length / itemsPerPage)
  );
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedNotes = filteredNotes.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleViewDetails = (note: Event) => {
    setSelectedNote(note);
    setDetailsOpen(true);
    setAddingItems(new Set());
    setTranscriptData([]);
    setShowFullTranscript(false);
    const alreadyAdded = new Set<number>(
      (note.action_items ?? []).flatMap((item, i) => (item.added ? [i] : []))
    );
    setAddedItems(alreadyAdded);
  };

  async function handleAddSingleTask(
    item: { task: string; dueDate: string | null; completed: boolean },
    index: number
  ) {
    setAddingItems((prev) => new Set(prev).add(index));
    try {
      await addProjectTasksAction({
        id: 0,
        userId: "",
        title: item.task,
        description: null,
        priority: "Medium",
        status: "in-progress",
        dueDate: item.dueDate,
        completed: item.completed ?? false,
        createdAt: null,
        updatedAt: null,
      });
      await markActionItemAdded(selectedNote!.id, index);
      setAddedItems((prev) => new Set(prev).add(index));
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } finally {
      setAddingItems((prev) => {
        const s = new Set(prev);
        s.delete(index);
        return s;
      });
    }
  }

  const allAdded =
    (selectedNote?.action_items?.length ?? 0) > 0 &&
    selectedNote?.action_items?.every((_, i) => addedItems.has(i));

  async function handleAddAllToTasks() {
    if (!selectedNote?.action_items?.length) return;
    await Promise.all(
      selectedNote.action_items.map((item, i) =>
        addedItems.has(i) ? Promise.resolve() : handleAddSingleTask(item, i)
      )
    );
  }

  const handleCopySummary = () => {
    if (selectedNote?.ai_summary) {
      navigator.clipboard.writeText(selectedNote.ai_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            placeholder="Search meeting notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <DropdownMenuContent align="end" className="w-48">
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
                    label: "Attendees (Most)",
                    field: "attendees",
                    dir: "desc",
                  },
                  {
                    label: "Attendees (Fewest)",
                    field: "attendees",
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
                  className="flex items-center justify-between cursor-pointer"
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
                {filterStatus !== "all" ? (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(
                [
                  { label: "All Notes", value: "all" },
                  { label: "With Transcript", value: "with-transcript" },
                ] as const
              ).map(({ label, value }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    setFilterStatus(value);
                    setPage(1);
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  {label}
                  {filterStatus === value && (
                    <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <FileText className="h-3.5 w-3.5" />
                  Meeting
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
                  Duration
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Users className="h-3.5 w-3.5" />
                  Attendees
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  Labels
                </div>
              </th>
              <th className="text-left px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Actions
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedNotes.map((note) => (
              <tr
                key={note.id}
                onClick={() => handleViewDetails(note)}
                className="cursor-pointer hover:bg-muted/50 transition-colors group"
              >
                <td className="px-4 py-3 max-w-[260px]">
                  <p className="text-sm font-medium text-foreground truncate">
                    {note.title}
                  </p>
                  {note.ai_summary && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {note.ai_summary.slice(0, 50)}...
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(note.dateTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  {note.duration ? (
                    <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                      {note.duration}m
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center -space-x-1.5">
                    {note.attendees.slice(0, 3).map((attendee, i) => (
                      <Avatar
                        key={i}
                        className="h-6 w-6 border-2 border-card ring-0"
                      >
                        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600">
                          {attendee.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {note.attendees.length > 3 && (
                      <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                        +{note.attendees.length - 3}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      <Sparkles className="h-2.5 w-2.5" />
                      AI
                    </span>
                    {note.hasTranscript && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        <Mic className="h-2.5 w-2.5" />
                        Transcript
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200 font-medium">
                    <CheckSquare className="h-3 w-3" />
                    {note?.action_items?.length ?? 0}
                  </span>
                </td>
              </tr>
            ))}
            {filteredNotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No notes match your search"
                      : "Notes are automatically generated after meetings with transcription enabled"}
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
          Showing {filteredNotes.length === 0 ? 0 : startIndex + 1}–
          {Math.min(startIndex + itemsPerPage, filteredNotes.length)} of{" "}
          {filteredNotes.length} notes
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

      {/* Meeting Details Modal — unchanged */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedNote.title}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateOnly(new Date(selectedNote.dateTime))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTimeOnly(new Date(selectedNote.dateTime))} ·{" "}
                      {selectedNote.duration} min
                    </span>
                    {selectedNote?.attendees &&
                      selectedNote.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {selectedNote.attendees.length} participant
                          {selectedNote.attendees.length !== 1 ? "s" : ""}
                        </span>
                      )}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Tags */}
                {selectedNote?.tags && selectedNote.tags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tags
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNote.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendees */}
                {selectedNote?.attendees &&
                  selectedNote.attendees.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Attendees
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedNote.attendees.map((attendee, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {attendee.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{attendee.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <Separator />

                {/* AI Summary */}
                {selectedNote.ai_summary && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          AI Summary
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={handleCopySummary}
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {selectedNote.ai_summary}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                {selectedNote?.key_points &&
                  selectedNote.key_points.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Key Points
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {selectedNote.key_points.map((point, index) => (
                          <li
                            key={index}
                            className="text-sm flex items-start text-foreground"
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full mt-2 mr-3 bg-blue-500 shrink-0" />
                            <span className="flex-1">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Action Items */}
                {selectedNote?.action_items &&
                  selectedNote.action_items.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckSquare className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Action Items ({selectedNote.action_items.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {selectedNote.action_items.map((item, index) => (
                          <div
                            key={index}
                            className="p-3 bg-muted/50 border border-border rounded-lg"
                          >
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <p className="text-sm text-foreground">
                                {item.task}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-6 px-2 shrink-0"
                                onClick={() => handleAddSingleTask(item, index)}
                                disabled={
                                  addingItems.has(index) ||
                                  addedItems.has(index)
                                }
                              >
                                {addingItems.has(index)
                                  ? "Adding..."
                                  : addedItems.has(index)
                                    ? "Added"
                                    : "Add"}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Due: {item.dueDate ?? "No due date"}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={handleAddAllToTasks}
                        disabled={allAdded}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        {allAdded ? "All Added" : "Add All to Tasks"}
                      </Button>
                    </div>
                  )}

                {/* Transcript */}
                {selectedNote.hasTranscript && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mic className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Transcript
                      </span>
                    </div>
                    {transcriptLoading ? (
                      <div className="p-4 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
                        Loading transcript...
                      </div>
                    ) : transcriptData.length > 0 ? (
                      <>
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/50 p-4">
                          <div className="space-y-4">
                            {(showFullTranscript
                              ? transcriptData
                              : transcriptData.slice(0, 3)
                            ).map((entry, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3"
                              >
                                <span className="text-xs mt-0.5 text-muted-foreground shrink-0 tabular-nums">
                                  {entry.time}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground mb-0.5">
                                    {entry.speaker}
                                  </p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {entry.text}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {transcriptData.length > 3 && (
                          <button
                            className="mt-2 text-sm text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                            onClick={() => setShowFullTranscript((v) => !v)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {showFullTranscript
                              ? "Show less"
                              : "View full transcript"}
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
