"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Separator } from "../ui/separator";
import {
  Calendar,
  Clock,
  Users,
  CheckSquare,
  FileText,
  ExternalLink,
  Copy,
  Mic,
  Sparkles,
  Tag,
  Check,
} from "lucide-react";
import { Event, RawChunk, TranscribedChunk } from "@/types/meeting";
import { formatDateOnly, formatTimeOnly } from "@/lib/date_utils";
import { addProjectTasksAction } from "@/lib/tasks";
import { markActionItemAdded } from "@/lib/meetings";
import axios from "axios";

interface MeetingDetailsDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailsDialog({
  event,
  open,
  onOpenChange,
}: MeetingDetailsDialogProps) {
  const hasAIContent = event.hasNotes || event.hasTranscript;
  const [formattedData, setFormattedData] = useState<TranscribedChunk[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingItems, setAddingItems] = useState<Set<number>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<number>>(
    () =>
      new Set<number>(
        (event.action_items ?? []).flatMap((item, i) => (item.added ? [i] : []))
      )
  );
  const queryClient = useQueryClient();

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
      await markActionItemAdded(event.id, index);
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

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  useEffect(() => {
    if (!open) {
      setShowFullTranscript(false);
      return;
    }
    if (!event.hasTranscript) return;
    const fn = async () => {
      setTranscriptLoading(true);
      try {
        const res = await axios.get(`/api/transcript/${event.id}`);
        const formatted = res.data[0].map((item: RawChunk) => ({
          speaker: item.speaker,
          time: formatTime(item.start_time),
          text: item.chunk_text,
          startTime: item.start_time,
          endTime: item.end_time,
        }));
        setFormattedData(formatted);
      } finally {
        setTranscriptLoading(false);
      }
    };
    fn();
  }, [event.id, open]);

  const allAdded =
    (event.action_items?.length ?? 0) > 0 &&
    event.action_items?.every((_, i) => addedItems.has(i));

  async function handleAddAllToTasks() {
    if (!event.action_items?.length) return;
    await Promise.all(
      event.action_items.map((item, i) =>
        addedItems.has(i) ? Promise.resolve() : handleAddSingleTask(item, i)
      )
    );
  }

  function handleCopySummary() {
    if (!event.ai_summary) return;
    navigator.clipboard.writeText(event.ai_summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateOnly(new Date(event.dateTime))}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeOnly(new Date(event.dateTime))} · {event.duration}{" "}
                min
              </span>
              {event.attendees && event.attendees.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {event.attendees.length} participant
                  {event.attendees.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tags
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Attendees
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {event.attendees.map((attendee, i) => (
                  <div
                    key={i}
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

          {/* Meeting Link */}
          {event.link && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Link
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={event.link}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-muted/50 text-muted-foreground"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard.writeText(event.link || "")
                  }
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    event.link && window.open(event.link, "_blank")
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open
                </Button>
              </div>
            </div>
          )}

          {hasAIContent && (
            <>
              <Separator />

              {/* AI Summary */}
              {event.hasNotes && event.ai_summary && (
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
                    {event.ai_summary}
                  </p>
                </div>
              )}

              {/* Key Points */}
              {event.hasNotes &&
                event.key_points &&
                event.key_points.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Key Points
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {event.key_points.map((point, i) => (
                        <li
                          key={i}
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
              {event.hasNotes &&
                event.action_items &&
                event.action_items.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Action Items ({event.action_items.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {event.action_items.map((item, i) => (
                        <div
                          key={i}
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
                              onClick={() => handleAddSingleTask(item, i)}
                              disabled={addingItems.has(i) || addedItems.has(i)}
                            >
                              {addingItems.has(i)
                                ? "Adding..."
                                : addedItems.has(i)
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
              {event.hasTranscript && (
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
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/50 p-4">
                        <div className="space-y-4">
                          {(showFullTranscript
                            ? formattedData
                            : formattedData.slice(0, 3)
                          ).map((chunk, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="text-xs mt-0.5 text-muted-foreground shrink-0 tabular-nums">
                                {chunk.time}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground mb-0.5">
                                  {chunk.speaker}
                                </p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {chunk.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {formattedData.length > 3 && (
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
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
