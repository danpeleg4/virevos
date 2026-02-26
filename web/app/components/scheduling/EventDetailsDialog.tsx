"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import {
  Video,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  FileText,
  ExternalLink,
  Copy,
  Mic,
} from "lucide-react";
import type { Event } from "@/types/meeting";
import { formatDateOnly, formatTimeOnly } from "@/lib/date_utils";
import { addProjectTasksAction } from "@/lib/server_actions/tasks";
import { markActionItemAdded } from "@/lib/server_actions/meetings";

interface MeetingDetailsDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockTranscript = `Sarah Johnson: Good morning everyone! Thanks for joining this onboarding call for Acme Corp.
Mike Chen: Happy to be here. We're excited to get started with Virevos.
Sarah Johnson: Great! Let me walk you through the key features we discussed in our sales call. First, the automation capabilities...
Mike Chen: Actually, before we dive in, can we make sure we have access to the API documentation?
Sarah Johnson: Absolutely. I'll send that over right after this call. Let me add that as a follow-up task.`;

export function EventDetailsDialog({
  event,
  open,
  onOpenChange,
}: MeetingDetailsDialogProps) {
  const hasAIContent = event.hasNotes || event.hasTranscript;
  const [addingItems, setAddingItems] = useState<Set<number>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<number>>(
    () => new Set<number>((event.action_items ?? []).flatMap((item, i) => (item.added ? [i] : [])))
  );
  const queryClient = useQueryClient();

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
      await markActionItemAdded(event.id, index);
      setAddedItems((prev) => new Set(prev).add(index));
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } finally {
      setAddingItems((prev) => { const s = new Set(prev); s.delete(index); return s; });
    }
  }

  const allAdded = (event.action_items?.length ?? 0) > 0 &&
    event.action_items?.every((_, i) => addedItems.has(i));

  async function handleAddAllToTasks() {
    if (!event.action_items?.length) return;
    await Promise.all(
      event.action_items.map((item, i) =>
        addedItems.has(i) ? Promise.resolve() : handleAddSingleTask(item, i)
      )
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl mb-2">{event.title}</DialogTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDateOnly(new Date(event.dateTime))}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTimeOnly(new Date(event.dateTime))} ({event.duration}{" "}
                  min)
                </div>
                <div className="flex items-center">
                  <Video className="h-4 w-4 mr-1" />
                </div>
              </div>
            </div>
            <Badge
              variant={event.status === "completed" ? "default" : "secondary"}
            >
              {event.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Attendees */}
          <div>
            {event.attendees && event.attendees.length > 0 && (
              <div>
                <h3 className="text-sm text-gray-700 mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Attendees
                </h3>

                <div className="flex flex-wrap gap-2">
                  {event.attendees.map((attendee, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {attendee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700">
                        {attendee.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meeting Link */}
          {event.link ? (
            <div>
              <h3 className="text-sm text-gray-700 mb-3">Link</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={event.link || ""}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                />
                <Button
                  className="cursor-pointer"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(event.link || "");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  className="cursor-pointer"
                  size="sm"
                  onClick={() => {
                    if (event.link) {
                      window.open(event.link, "_blank");
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Join
                </Button>
              </div>
            </div>
          ) : null}

          {hasAIContent && (
            <>
              <Separator />

              {/* AI-Generated Notes */}
              {event.hasNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <FileText className="h-5 w-5 mr-2 text-purple-600" />
                      AI-Generated Meeting Notes
                      <Badge className="ml-2 bg-purple-100 text-purple-700">
                        Auto
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm text-gray-700 mb-2">Summary</h4>
                      <p className="text-sm text-gray-600">
                        {event.ai_summary}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm text-gray-700 mb-2">Key Points</h4>
                      <ul className="space-y-1">
                        {event?.key_points?.map((point, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-600 flex items-start"
                          >
                            <span className="mr-2">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm text-gray-700 mb-3 flex items-center">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Action Items ({event?.action_items?.length})
                      </h4>
                      <div className="space-y-2">
                        {event?.action_items?.map((item, i) => (
                          <div
                            key={i}
                            className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm text-gray-900">
                                {item.task}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-6 px-2 bg-white"
                                onClick={() => handleAddSingleTask(item, i)}
                                disabled={addingItems.has(i) || addedItems.has(i)}
                              >
                                {addingItems.has(i) ? "Adding..." : addedItems.has(i) ? "Added" : "Add"}
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
                  </CardContent>
                </Card>
              )}

              {/* Transcript */}
              {event.hasTranscript && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Mic className="h-5 w-5 mr-2 text-blue-600" />
                      Meeting Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-3 text-sm">
                        {mockTranscript.split("\n\n").map((paragraph, i) => (
                          <p key={i} className="text-gray-700">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Export Transcript
                      </Button>
                      <Button size="sm" variant="outline">
                        Search Transcript
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
