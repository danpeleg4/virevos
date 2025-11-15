import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
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
} from "lucide-react";
import { motion } from "motion/react";

interface MeetingNote {
  id: string;
  meetingTitle: string;
  date: string;
  attendees: { name: string; initials: string }[];
  summary: string;
  actionItems: number;
  keyPoints: number;
  transcriptAvailable: boolean;
  status: "completed" | "in-progress";
}

const mockNotes: MeetingNote[] = [
  {
    id: "1",
    meetingTitle: "Client Onboarding - Acme Corp",
    date: "Today, 9:00 AM",
    attendees: [
      { name: "Sarah Johnson", initials: "SJ" },
      { name: "Mike Chen", initials: "MC" },
    ],
    summary: "Initial onboarding session for Acme Corp. Covered platform overview, automation setup, and integration requirements.",
    actionItems: 3,
    keyPoints: 4,
    transcriptAvailable: true,
    status: "completed",
  },
  {
    id: "2",
    meetingTitle: "Sprint Planning",
    date: "Nov 10, 2025",
    attendees: [
      { name: "Team", initials: "T" },
      { name: "John Doe", initials: "JD" },
    ],
    summary: "Planned Sprint 23 with focus on automation improvements and new scheduling features.",
    actionItems: 8,
    keyPoints: 6,
    transcriptAvailable: true,
    status: "completed",
  },
  {
    id: "3",
    meetingTitle: "Design Review",
    date: "Nov 9, 2025",
    attendees: [{ name: "Alex Kim", initials: "AK" }],
    summary: "Reviewed new dashboard designs and provided feedback on UX improvements.",
    actionItems: 2,
    keyPoints: 3,
    transcriptAvailable: false,
    status: "completed",
  },
  {
    id: "4",
    meetingTitle: "Q4 Planning Session",
    date: "Nov 8, 2025",
    attendees: [
      { name: "Emily Davis", initials: "ED" },
      { name: "Robert Wilson", initials: "RW" },
    ],
    summary: "Strategic planning for Q4 goals, resource allocation, and key initiatives.",
    actionItems: 12,
    keyPoints: 8,
    transcriptAvailable: true,
    status: "completed",
  },
];

export function MeetingNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);

  const filteredNotes = mockNotes.filter((note) => {
    const matchesSearch =
      note.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "with-transcript" && note.transcriptAvailable);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notes</p>
                <p className="text-2xl text-gray-900 mt-1">{mockNotes.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Transcripts</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {mockNotes.filter((n) => n.transcriptAvailable).length}
                </p>
              </div>
              <Mic className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Action Items</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {mockNotes.reduce((sum, n) => sum + n.actionItems, 0)}
                </p>
              </div>
              <CheckSquare className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl text-gray-900 mt-1">2</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className="text-lg">{note.meetingTitle}</CardTitle>
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
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {note.date}
                      </div>
                      <div className="flex -space-x-2">
                        {note.attendees.map((attendee, i) => (
                          <Avatar key={i} className="h-6 w-6 border-2 border-white">
                            <AvatarFallback className="text-xs">
                              {attendee.initials}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">{note.summary}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <CheckSquare className="h-4 w-4 mr-1 text-green-600" />
                      {note.actionItems} action items
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-blue-600" />
                      {note.keyPoints} key points
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
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
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No meeting notes found</p>
            <p className="text-sm text-gray-500 mt-1">
              Notes are automatically generated after meetings with transcription enabled
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
