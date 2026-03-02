import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { addProjectTasksAction } from "@/lib/server_actions/tasks";
import { markActionItemAdded } from "@/lib/server_actions/meetings";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Event, RawChunk, TranscribedChunk } from "@/types/meeting";

export function MeetingNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedNote, setSelectedNote] = useState<Event | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingItems, setAddingItems] = useState<Set<number>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [transcriptData, setTranscriptData] = useState<TranscribedChunk[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const queryClient = useQueryClient();
  const PAGE_SIZE = 4;

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const meetings = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const res = await axios.get("/api/events");
      const data: Event[] = res.data;
      return data.map((m) => ({
        ...m,
        attendees: m.attendees ?? [],
      }));
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
        const formatted = res.data[0].map((item: RawChunk) => ({
          speaker: item.speaker,
          time: formatTime(item.start_time),
          text: item.chunk_text,
          startTime: item.start_time,
        }));
        setTranscriptData(formatted);
      } finally {
        setTranscriptLoading(false);
      }
    };
    fn();
  }, [detailsOpen, selectedNote?.hasTranscript]);

  const filteredNotes = meetings?.data?.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note?.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "with-transcript" && note.hasTranscript);
    return matchesSearch && matchesFilter;
  });
  const totalPages = Math.max(1, Math.ceil((filteredNotes?.length ?? 0) / PAGE_SIZE));
  const paginatedNotes = filteredNotes?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  async function handleAddSingleTask(item: { task: string; dueDate: string | null; completed: boolean }, index: number) {
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
      setAddingItems((prev) => { const s = new Set(prev); s.delete(index); return s; });
    }
  }

  const allAdded = (selectedNote?.action_items?.length ?? 0) > 0 &&
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
    if (selectedNote && selectedNote.ai_summary) {
      navigator.clipboard.writeText(selectedNote.ai_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`}
              />
              <Input
                placeholder="Search meeting notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                <SelectItem value="with-transcript">With Transcript</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {paginatedNotes?.map((note, index) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`hover:shadow-md transition-shadow cursor-pointer`}
              onClick={() => handleViewDetails(note)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className={`text-lg`}>{note.title}</CardTitle>
                      <Badge className="bg-purple-100 text-purple-700">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Generated
                      </Badge>
                      {note.hasTranscript && (
                        <Badge variant="outline">
                          <Mic className="h-3 w-3 mr-1" />
                          Transcript
                        </Badge>
                      )}
                    </div>
                    <div
                      className={`flex items-center space-x-3 text-sm text-gray-600`}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(note.dateTime).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {note.duration}m
                      </div>
                      <div className="flex -space-x-2">
                        {note.attendees.slice(0, 3).map((attendee, i) => (
                          <Avatar
                            key={i}
                            className="h-6 w-6 border-2 border-white"
                          >
                            <AvatarFallback className={`text-xs`}>
                              {attendee.initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {note.attendees.length > 3 && (
                          <div
                            className={`h-6 w-6 rounded-full border-2 border-white flex items-center justify-center text-xs bg-gray-200 text-gray-600`}
                          >
                            +{note.attendees.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-gray-400`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className={`text-sm text-gray-700`}>{note.ai_summary}</p>

                <div
                  className={`flex items-center justify-between pt-3 border-t border-gray-200`}
                >
                  <div
                    className={`flex items-center space-x-4 text-sm text-gray-600`}
                  >
                    <div className="flex items-center">
                      <CheckSquare className={`h-4 w-4 mr-1 text-green-600`} />
                      {note?.action_items?.length} action items
                    </div>
                    <div className="flex items-center">
                      <FileText className={`h-4 w-4 mr-1 text-blue-600`} />
                      {note?.key_points?.length} key points
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(note);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {filteredNotes?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className={`h-12 w-12 mx-auto mb-4 text-gray-400`} />
            <p className="text-gray-600">No meeting notes found</p>
            <p className={`text-sm mt-1 text-gray-500`}>
              Notes are automatically generated after meetings with
              transcription enabled
            </p>
          </CardContent>
        </Card>
      )}

      {/* Meeting Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl">
                      {selectedNote.title}
                    </DialogTitle>
                    <DialogDescription className="mt-2">
                      <span className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(selectedNote.dateTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {selectedNote.duration}m
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {selectedNote?.attendees?.length} participants
                        </span>
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Tags */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <h3 className={`text-sm text-gray-700`}>Tags</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNote?.tags?.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Attendees */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="h-4 w-4 text-gray-500" />
                    <h3 className={`text-sm text-gray-700`}>Attendees</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedNote?.attendees?.map((attendee, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`text-sm`}>
                            {attendee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={`text-sm text-gray-900`}>
                            {attendee.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Summary */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <h3 className={`text-sm text-gray-700`}>AI Summary</h3>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopySummary}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className={`text-sm leading-relaxed text-gray-700`}>
                    {selectedNote.ai_summary}
                  </p>
                </div>

                {/* Key Points */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <h3 className={`text-sm text-gray-700`}>Key Points</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedNote?.key_points?.map((point, index) => (
                      <li
                        key={index}
                        className={`text-sm flex items-start text-gray-700`}
                      >
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full mt-2 mr-3 bg-blue-500`}
                        ></span>
                        <span className="flex-1">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckSquare className="h-4 w-4 text-orange-500" />
                    <h3 className={`text-sm text-gray-700`}>
                      Action Items ({selectedNote?.action_items?.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {selectedNote?.action_items?.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm text-gray-900">{item.task}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 bg-white"
                            onClick={() => handleAddSingleTask(item, index)}
                            disabled={
                              addingItems.has(index) || addedItems.has(index)
                            }
                          >
                            {addingItems.has(index)
                              ? "Adding..."
                              : addedItems.has(index)
                                ? "Added"
                                : "Add"}
                          </Button>
                        </div>
                        <div className="flex items-center text-xs text-gray-600 space-x-3">
                          <span>Due: {item.dueDate ?? "No due date"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="mt-3"
                    variant="outline"
                    onClick={handleAddAllToTasks}
                    disabled={allAdded}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {allAdded ? "All Added" : "Add All to Tasks"}
                  </Button>
                </div>

                {/* Transcript */}
                {selectedNote.hasTranscript && (
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Mic className="h-4 w-4 text-purple-500" />
                      <h3 className={`text-sm text-gray-700`}>Transcript</h3>
                    </div>
                    {transcriptLoading ? (
                      <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 text-sm text-gray-400">
                        Loading transcript...
                      </div>
                    ) : transcriptData.length > 0 ? (
                      <>
                        <div className={`max-h-96 overflow-y-auto p-4 rounded-lg border bg-gray-50 border-gray-200`}>
                          <div className="space-y-4">
                            {(showFullTranscript ? transcriptData : transcriptData.slice(0, 3)).map((entry, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <span className={`text-xs mt-1 text-gray-400 shrink-0`}>{entry.time}</span>
                                <div className="flex-1">
                                  <p className={`text-sm font-medium mb-0.5 text-blue-600`}>{entry.speaker}</p>
                                  <p className={`text-sm text-gray-700`}>{entry.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {transcriptData.length > 3 && (
                          <button
                            className="cursor-pointer mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1"
                            onClick={() => setShowFullTranscript((v) => !v)}
                          >
                            <FileText className="h-4 w-4" />
                            {showFullTranscript ? "Show Less" : "View Full Transcript"}
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                )}

                {/* Actions */}
                <div
                  className={`flex justify-end space-x-3 pt-4 border-t border-gray-200`}
                >
                  <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
