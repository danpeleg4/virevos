import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
  Clock,
  Users,
  Tag,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { Event } from "@/types/meeting";

export function MeetingNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedNote, setSelectedNote] = useState<Event | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const filteredNotes = meetings?.data?.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note?.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "with-transcript" && note.hasTranscript);
    return matchesSearch && matchesFilter;
  });

  const handleViewDetails = (note: Event) => {
    setSelectedNote(note);
    setDetailsOpen(true);
  };

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
        {filteredNotes?.map((note, index) => (
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
                        {note.dateTime.toString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {note.duration}
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
                          {new Date(selectedNote.dateTime).toLocaleDateString()}
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
                    <h3 className={`text-sm text-gray-700`}>Action Items</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedNote?.action_items?.map((item, index) => (
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
                          <p
                            className={`text-sm ${item.completed ? "line-through" : ""} text-gray-700`}
                          >
                            {item.task}
                          </p>
                          <div
                            className={`flex items-center space-x-3 text-xs mt-1 text-gray-500`}
                          >
                            <span>👤 {item.owner}</span>
                            <span>📅 Due {item.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transcript */}
                {selectedNote.hasTranscript &&
                  selectedNote.transcript &&
                  selectedNote?.transcript?.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Mic className="h-4 w-4 text-purple-500" />
                        <h3 className={`text-sm text-gray-700`}>Transcript</h3>
                      </div>
                      <div
                        className={`max-h-96 overflow-y-auto p-4 rounded-lg border bg-gray-50 border-gray-200`}
                      >
                        <div className="space-y-3">
                          {selectedNote?.transcript?.map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-3"
                            >
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
