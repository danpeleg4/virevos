import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
import type { Meeting } from "@/types/meeting";

interface MeetingDetailsDialogProps {
  meeting: Meeting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockTranscript = `Sarah Johnson: Good morning everyone! Thanks for joining this onboarding call for Acme Corp.

Mike Chen: Happy to be here. We're excited to get started with Virevos.

Sarah Johnson: Great! Let me walk you through the key features we discussed in our sales call. First, the automation capabilities...

Mike Chen: Actually, before we dive in, can we make sure we have access to the API documentation?

Sarah Johnson: Absolutely. I'll send that over right after this call. Let me add that as a follow-up task.`;

const mockNotes = {
  summary: "Initial onboarding session for Acme Corp. Covered platform overview, automation setup, and integration requirements.",
  keyPoints: [
    "Client needs Slack integration for team notifications",
    "Planning to migrate 50+ active projects from current tool",
    "Interested in enterprise plan with custom automation templates",
    "Weekly check-in calls scheduled for first month",
  ],
  actionItems: [
    {
      task: "Send API documentation to Mike Chen",
      assignee: "Sarah Johnson",
      dueDate: "Today",
      status: "pending",
    },
    {
      task: "Set up Slack integration for Acme Corp workspace",
      assignee: "Tech Team",
      dueDate: "Nov 13, 2025",
      status: "pending",
    },
    {
      task: "Schedule migration planning session",
      assignee: "Sarah Johnson",
      dueDate: "Nov 15, 2025",
      status: "pending",
    },
  ],
  followUps: [
    "Review enterprise plan pricing and features",
    "Prepare custom automation template examples",
    "Connect with their IT team for security review",
  ],
};

export function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
}: MeetingDetailsDialogProps) {
  const hasAIContent = meeting.hasNotes || meeting.hasTranscript;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl mb-2">{meeting.title}</DialogTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Today
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {meeting.time} ({meeting.duration} min)
                </div>
                <div className="flex items-center">
                  <Video className="h-4 w-4 mr-1" />
                  {meeting.type === "zoom" ? "Zoom" : "Google Meet"}
                </div>
              </div>
            </div>
            <Badge
              variant={meeting.status === "completed" ? "default" : "secondary"}
            >
              {meeting.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Attendees */}
          <div>
              {meeting.attendees && (
                  <div>
                      <h3 className="text-sm text-gray-700 mb-3 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Attendees
                      </h3>

                      <div className="flex flex-wrap gap-2">
                          {meeting.attendees.map((attendee, i) => (
                              <div
                                  key={i}
                                  className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2"
                              >
                                  <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                          {attendee.initials}
                                      </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-gray-700">{attendee.name}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

          </div>

          {/* Meeting Link */}
          <div>
            <h3 className="text-sm text-gray-700 mb-3">Meeting Link</h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value="https://zoom.us/j/123456789"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
              />
              <Button size="sm" variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Join
              </Button>
            </div>
          </div>

          {hasAIContent && (
            <>
              <Separator />

              {/* AI-Generated Notes */}
              {meeting.hasNotes && (
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
                      <p className="text-sm text-gray-600">{mockNotes.summary}</p>
                    </div>

                    <div>
                      <h4 className="text-sm text-gray-700 mb-2">Key Points</h4>
                      <ul className="space-y-1">
                        {mockNotes.keyPoints.map((point, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm text-gray-700 mb-3 flex items-center">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Action Items ({mockNotes.actionItems.length})
                      </h4>
                      <div className="space-y-2">
                        {mockNotes.actionItems.map((item, i) => (
                          <div
                            key={i}
                            className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm text-gray-900">{item.task}</p>
                              <Badge
                                variant="outline"
                                className="text-xs bg-white"
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <div className="flex items-center text-xs text-gray-600 space-x-3">
                              <span>Assignee: {item.assignee}</span>
                              <span>•</span>
                              <span>Due: {item.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button size="sm" className="mt-3" variant="outline">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Add All to Tasks
                      </Button>
                    </div>

                    <div>
                      <h4 className="text-sm text-gray-700 mb-2">Follow-ups</h4>
                      <ul className="space-y-1">
                        {mockNotes.followUps.map((followUp, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{followUp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transcript */}
              {meeting.hasTranscript && (
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

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="outline">Reschedule</Button>
            {meeting.status === "scheduled" && (
              <Button>Join Meeting</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
