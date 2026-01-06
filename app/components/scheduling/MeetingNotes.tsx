import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
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
  Download,
  ExternalLink,
  Clock,
  Users,
  Tag,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MeetingNote {
  id: string;
  meetingTitle: string;
  date: string;
  time: string;
  duration: string;
  attendees: { name: string; initials: string; email: string }[];
  summary: string;
  actionItems: { task: string; owner: string; dueDate: string; completed: boolean }[];
  keyPoints: string[];
  decisions: string[];
  transcript: { speaker: string; time: string; text: string }[];
  tags: string[];
  transcriptAvailable: boolean;
  status: "completed" | "in-progress";
}

const mockNotes: MeetingNote[] = [
  {
    id: "1",
    meetingTitle: "Client Onboarding - Acme Corp",
    date: "Jan 5, 2026",
    time: "9:00 AM",
    duration: "45 min",
    attendees: [
      { name: "Sarah Johnson", initials: "SJ", email: "sarah@acme.com" },
      { name: "Mike Chen", initials: "MC", email: "mike@flowtask.com" },
      { name: "Emily Davis", initials: "ED", email: "emily@flowtask.com" },
    ],
    summary: "Initial onboarding session for Acme Corp. Covered platform overview, automation setup, and integration requirements. Client expressed interest in advanced workflow automation and calendar integrations. Discussed timeline for implementation and training schedule.",
    actionItems: [
      { task: "Send integration documentation to client", owner: "Mike Chen", dueDate: "Jan 7", completed: true },
      { task: "Schedule follow-up training session", owner: "Emily Davis", dueDate: "Jan 10", completed: false },
      { task: "Prepare custom automation templates", owner: "Mike Chen", dueDate: "Jan 12", completed: false },
    ],
    keyPoints: [
      "Client needs Salesforce integration by end of month",
      "Team size will grow from 5 to 15 users in Q1",
      "Focus on automation for sales workflows",
      "Weekly check-ins scheduled for first month",
    ],
    decisions: [
      "Proceed with Enterprise plan with custom integrations",
      "Start with pilot team of 5 users before full rollout",
      "Prioritize calendar and email integrations first",
    ],
    transcript: [
      { speaker: "Sarah Johnson", time: "00:00", text: "Thanks for meeting with us today. We're excited to get started with FlowTask." },
      { speaker: "Mike Chen", time: "00:05", text: "Great to meet you Sarah! Let me give you a quick overview of what we'll cover today." },
      { speaker: "Mike Chen", time: "00:12", text: "First, I'll walk you through the core features, then we can dive into your specific automation needs." },
      { speaker: "Sarah Johnson", time: "00:25", text: "Perfect. We're particularly interested in the Salesforce integration. How does that work?" },
      { speaker: "Emily Davis", time: "00:32", text: "Great question! Our Salesforce integration syncs bidirectionally, so any updates in FlowTask reflect in Salesforce and vice versa." },
      { speaker: "Sarah Johnson", time: "00:45", text: "That's exactly what we need. We currently have about 5 people who would use this initially." },
      { speaker: "Mike Chen", time: "00:52", text: "Perfect. We recommend starting with a pilot team like that. It helps everyone get comfortable with the platform." },
      { speaker: "Sarah Johnson", time: "01:08", text: "Makes sense. What about the timeline? We'd like to have this fully operational by end of month." },
      { speaker: "Emily Davis", time: "01:15", text: "That's definitely doable. I can send you our integration documentation today, and we'll schedule training for next week." },
    ],
    tags: ["Client Onboarding", "Enterprise", "Salesforce Integration"],
    transcriptAvailable: true,
    status: "completed",
  },
  {
    id: "2",
    meetingTitle: "Sprint Planning - Q1 2026",
    date: "Jan 4, 2026",
    time: "2:00 PM",
    duration: "1h 30min",
    attendees: [
      { name: "Development Team", initials: "DT", email: "dev@flowtask.com" },
      { name: "John Doe", initials: "JD", email: "john@flowtask.com" },
      { name: "Alex Kim", initials: "AK", email: "alex@flowtask.com" },
    ],
    summary: "Planned Sprint 23 with focus on automation improvements and new scheduling features. Team committed to 45 story points. Discussed technical debt and performance optimizations.",
    actionItems: [
      { task: "Complete API performance audit", owner: "John Doe", dueDate: "Jan 8", completed: false },
      { task: "Design new automation builder UI", owner: "Alex Kim", dueDate: "Jan 10", completed: false },
      { task: "Review backlog priorities", owner: "Development Team", dueDate: "Jan 6", completed: true },
      { task: "Update documentation for new features", owner: "John Doe", dueDate: "Jan 15", completed: false },
      { task: "Conduct load testing on staging", owner: "Development Team", dueDate: "Jan 12", completed: false },
    ],
    keyPoints: [
      "Sprint velocity increased by 15% from last sprint",
      "New automation builder expected to reduce user setup time by 50%",
      "Performance improvements are top priority",
      "Need to allocate time for technical debt in next sprint",
      "All critical bugs resolved from previous sprint",
      "Team capacity at 100% for this sprint",
    ],
    decisions: [
      "Automation builder is highest priority feature",
      "Dedicate 20% of sprint to performance optimizations",
      "Daily standups moved to 10 AM",
      "Code freeze on Thursdays for better testing",
    ],
    transcript: [
      { speaker: "John Doe", time: "00:00", text: "Alright team, let's kick off Sprint 23 planning. We have some exciting features lined up." },
      { speaker: "Alex Kim", time: "00:08", text: "I've been working on the new automation builder designs. I think we can make it much more intuitive." },
      { speaker: "Development Team", time: "00:18", text: "The designs look great Alex. How much effort are we estimating for the implementation?" },
      { speaker: "Alex Kim", time: "00:25", text: "I'd say about 21 story points, spread across frontend and backend work." },
      { speaker: "John Doe", time: "00:35", text: "That seems reasonable. Let's also make sure we allocate time for the performance work we discussed." },
    ],
    tags: ["Sprint Planning", "Development", "Automation"],
    transcriptAvailable: true,
    status: "completed",
  },
  {
    id: "3",
    meetingTitle: "Design Review - Dashboard Redesign",
    date: "Jan 3, 2026",
    time: "11:00 AM",
    duration: "1h",
    attendees: [
      { name: "Alex Kim", initials: "AK", email: "alex@flowtask.com" },
      { name: "Design Team", initials: "DT", email: "design@flowtask.com" },
    ],
    summary: "Reviewed new dashboard designs and provided feedback on UX improvements. Focused on information hierarchy, data visualization, and mobile responsiveness.",
    actionItems: [
      { task: "Update color palette for better accessibility", owner: "Alex Kim", dueDate: "Jan 8", completed: false },
      { task: "Create mobile mockups", owner: "Design Team", dueDate: "Jan 9", completed: false },
    ],
    keyPoints: [
      "New card-based layout improves scanability",
      "Need to ensure WCAG 2.1 AA compliance",
      "Mobile-first approach for responsive design",
    ],
    decisions: [
      "Proceed with card-based dashboard layout",
      "Implement dark mode from the start",
    ],
    transcript: [],
    tags: ["Design", "UX", "Dashboard"],
    transcriptAvailable: false,
    status: "completed",
  },
  {
    id: "4",
    meetingTitle: "Q1 Strategic Planning",
    date: "Jan 2, 2026",
    time: "10:00 AM",
    duration: "2h",
    attendees: [
      { name: "Emily Davis", initials: "ED", email: "emily@flowtask.com" },
      { name: "Robert Wilson", initials: "RW", email: "robert@flowtask.com" },
      { name: "Leadership Team", initials: "LT", email: "leadership@flowtask.com" },
    ],
    summary: "Strategic planning for Q1 goals, resource allocation, and key initiatives. Discussed revenue targets, hiring plans, and product roadmap priorities.",
    actionItems: [
      { task: "Finalize Q1 OKRs for each department", owner: "Leadership Team", dueDate: "Jan 8", completed: false },
      { task: "Create hiring plan for engineering", owner: "Robert Wilson", dueDate: "Jan 10", completed: false },
      { task: "Review and update product roadmap", owner: "Emily Davis", dueDate: "Jan 12", completed: false },
      { task: "Schedule monthly all-hands meetings", owner: "Leadership Team", dueDate: "Jan 5", completed: true },
      { task: "Prepare Q4 performance review", owner: "Emily Davis", dueDate: "Jan 15", completed: false },
    ],
    keyPoints: [
      "Target 40% revenue growth in Q1",
      "Plan to hire 8 new engineers",
      "Focus on enterprise customer acquisition",
      "Expand to European market by Q2",
      "Launch new AI features in March",
      "Improve customer retention by 15%",
      "Increase marketing budget by 25%",
      "Partner with 3 major integration providers",
    ],
    decisions: [
      "AI features are top product priority for Q1",
      "Open London office in Q2",
      "Increase sales team by 50%",
      "Invest in customer success team expansion",
    ],
    transcript: [
      { speaker: "Emily Davis", time: "00:00", text: "Thanks everyone for joining. Let's dive into our Q1 strategic priorities." },
      { speaker: "Robert Wilson", time: "00:08", text: "I'd like to start with our hiring needs. Engineering is at capacity and we need to scale." },
      { speaker: "Leadership Team", time: "00:18", text: "Agreed. What's the timeline you're thinking for new hires?" },
      { speaker: "Robert Wilson", time: "00:25", text: "Ideally we'd have offers out by end of January, with people starting in February and March." },
      { speaker: "Emily Davis", time: "00:35", text: "That aligns well with our product roadmap. The AI features will need that additional capacity." },
    ],
    tags: ["Strategy", "Planning", "Q1", "Leadership"],
    transcriptAvailable: true,
    status: "completed",
  },
];

export function MeetingNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredNotes = mockNotes.filter((note) => {
    const matchesSearch =
        note.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "with-transcript" && note.transcriptAvailable);
    return matchesSearch && matchesFilter;
  });

  const handleViewDetails = (note: MeetingNote) => {
    setSelectedNote(note);
    setDetailsOpen(true);
  };

  const handleCopySummary = () => {
    if (selectedNote) {
      navigator.clipboard.writeText(selectedNote.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm text-gray-600`}>Total Notes</p>
                  <p className={`text-2xl mt-1 text-gray-900`}>{mockNotes.length}</p>
                </div>
                <FileText className={`h-8 w-8 text-blue-500`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm text-gray-600`}>With Transcripts</p>
                  <p className={`text-2xl mt-1 text-gray-900`}>
                    {mockNotes.filter((n) => n.transcriptAvailable).length}
                  </p>
                </div>
                <Mic className={`h-8 w-8 text-purple-500`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm text-gray-600`}>Action Items</p>
                  <p className={`text-2xl mt-1 text-gray-900`}>
                    {mockNotes.reduce((sum, n) => sum + n.actionItems.length, 0)}
                  </p>
                </div>
                <CheckSquare className={`h-8 w-8 text-green-500`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm text-gray-600`}>This Week</p>
                  <p className={`text-2xl mt-1 text-gray-900`}>4</p>
                </div>
                <Calendar className={`h-8 w-8 text-orange-500`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
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
          {filteredNotes.map((note, index) => (
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
                          <CardTitle className={`text-lg`}>
                            {note.meetingTitle}
                          </CardTitle>
                          <Badge className="bg-purple-100 text-purple-700">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                          {note.transcriptAvailable && (
                              <Badge variant="outline">
                                <Mic className="h-3 w-3 mr-1" />
                                Transcript
                              </Badge>
                          )}
                        </div>
                        <div className={`flex items-center space-x-3 text-sm text-gray-600`}>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {note.date} at {note.time}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {note.duration}
                          </div>
                          <div className="flex -space-x-2">
                            {note.attendees.slice(0, 3).map((attendee, i) => (
                                <Avatar key={i} className="h-6 w-6 border-2 border-white">
                                  <AvatarFallback className={`text-xs`}>
                                    {attendee.initials}
                                  </AvatarFallback>
                                </Avatar>
                            ))}
                            {note.attendees.length > 3 && (
                                <div className={`h-6 w-6 rounded-full border-2 border-white flex items-center justify-center text-xs bg-gray-200 text-gray-600`}>
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
                    <p className={`text-sm text-gray-700`}>{note.summary}</p>

                    <div className={`flex items-center justify-between pt-3 border-t border-gray-200`}>
                      <div className={`flex items-center space-x-4 text-sm text-gray-600`}>
                        <div className="flex items-center">
                          <CheckSquare className={`h-4 w-4 mr-1 text-green-600`} />
                          {note.actionItems.length} action items
                        </div>
                        <div className="flex items-center">
                          <FileText className={`h-4 w-4 mr-1 text-blue-600`} />
                          {note.keyPoints.length} key points
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

        {filteredNotes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className={`h-12 w-12 mx-auto mb-4 text-gray-400`} />
                <p className="text-gray-600">No meeting notes found</p>
                <p className={`text-sm mt-1 text-gray-500`}>
                  Notes are automatically generated after meetings with transcription enabled
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
                        <DialogTitle className="text-2xl">{selectedNote.meetingTitle}</DialogTitle>
                        <DialogDescription className="mt-2">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {selectedNote.date} at {selectedNote.time}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {selectedNote.duration}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {selectedNote.attendees.length} participants
                            </div>
                          </div>
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
                        {selectedNote.tags.map((tag, index) => (
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
                        {selectedNote.attendees.map((attendee, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className={`text-sm`}>
                                  {attendee.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className={`text-sm text-gray-900`}>{attendee.name}</p>
                                <p className={`text-xs text-gray-500`}>{attendee.email}</p>
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
                        {selectedNote.summary}
                      </p>
                    </div>

                    {/* Key Points */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <h3 className={`text-sm text-gray-700`}>Key Points</h3>
                      </div>
                      <ul className="space-y-2">
                        {selectedNote.keyPoints.map((point, index) => (
                            <li key={index} className={`text-sm flex items-start text-gray-700`}>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 mr-3 bg-blue-500`}></span>
                              <span className="flex-1">{point}</span>
                            </li>
                        ))}
                      </ul>
                    </div>

                    {/* Decisions */}
                    {selectedNote.decisions.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <CheckSquare className="h-4 w-4 text-green-500" />
                            <h3 className={`text-sm text-gray-700`}>Decisions Made</h3>
                          </div>
                          <ul className="space-y-2">
                            {selectedNote.decisions.map((decision, index) => (
                                <li key={index} className={`text-sm flex items-start text-gray-700`}>
                                  <CheckSquare className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-500`} />
                                  <span className="flex-1">{decision}</span>
                                </li>
                            ))}
                          </ul>
                        </div>
                    )}

                    {/* Action Items */}
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckSquare className="h-4 w-4 text-orange-500" />
                        <h3 className={`text-sm text-gray-700`}>Action Items</h3>
                      </div>
                      <div className="space-y-2">
                        {selectedNote.actionItems.map((item, index) => (
                            <div
                                key={index}
                                className={`flex items-start space-x-3 p-3 rounded-lg border bg-gray-50 border-gray-200`}
                            >
                              <input
                                  type="checkbox"
                                  checked={item.completed}
                                  readOnly
                                  className="mt-1 h-4 w-4 rounded border-gray-300"
                              />
                              <div className="flex-1">
                                <p className={`text-sm ${item.completed ? "line-through" : ""} text-gray-700`}>
                                  {item.task}
                                </p>
                                <div className={`flex items-center space-x-3 text-xs mt-1 text-gray-500`}>
                                  <span>👤 {item.owner}</span>
                                  <span>📅 Due {item.dueDate}</span>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>

                    {/* Transcript */}
                    {selectedNote.transcriptAvailable && selectedNote.transcript.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <Mic className="h-4 w-4 text-purple-500" />
                            <h3 className={`text-sm text-gray-700`}>Transcript</h3>
                          </div>
                          <div className={`max-h-96 overflow-y-auto p-4 rounded-lg border bg-gray-50 border-gray-200`}>
                            <div className="space-y-3">
                              {selectedNote.transcript.map((entry, index) => (
                                  <div key={index} className="flex items-start space-x-3">
                            <span className={`text-xs mt-1 text-gray-400`}>
                              {entry.time}
                            </span>
                                    <div className="flex-1">
                                      <p className={`text-sm mb-1 text-blue-600`}>
                                        {entry.speaker}
                                      </p>
                                      <p className={`text-sm text-gray-700`}>
                                        {entry.text}
                                      </p>
                                    </div>
                                  </div>
                              ))}
                            </div>
                          </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className={`flex justify-end space-x-3 pt-4 border-t border-gray-200`}>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button variant="outline">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      <Button onClick={() => setDetailsOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}
