import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Clock,
  Plus,
  Calendar,
  Mail,
  MessageSquare,
  Edit,
  Trash2,
  Send,
} from "lucide-react";
import { motion } from "motion/react";

interface ScheduledMessage {
  id: string;
  type: "email" | "chat";
  recipient: string;
  initials: string;
  client: string;
  subject?: string;
  content: string;
  scheduledFor: string;
  scheduledDate: Date;
  status: "scheduled" | "sending" | "sent" | "failed";
}

const mockScheduledMessages: ScheduledMessage[] = [
  {
    id: "1",
    type: "email",
    recipient: "Sarah Johnson",
    initials: "SJ",
    client: "Acme Corp",
    subject: "Weekly Project Update",
    content: "Hi Sarah, Here's your weekly update on the Q4 project...",
    scheduledFor: "Tomorrow, 9:00 AM",
    scheduledDate: new Date(Date.now() + 86400000),
    status: "scheduled",
  },
  {
    id: "2",
    type: "chat",
    recipient: "Mike Chen",
    initials: "MC",
    client: "TechStart Inc",
    content: "Hey Mike, just checking in on the API integration progress...",
    scheduledFor: "Nov 13, 2025, 2:00 PM",
    scheduledDate: new Date("2025-11-13T14:00:00"),
    status: "scheduled",
  },
  {
    id: "3",
    type: "email",
    recipient: "Alex Kim",
    initials: "AK",
    client: "DesignCo",
    subject: "Invoice Reminder",
    content: "Hi Alex, This is a friendly reminder that invoice #1234 is due...",
    scheduledFor: "Nov 15, 2025, 10:00 AM",
    scheduledDate: new Date("2025-11-15T10:00:00"),
    status: "scheduled",
  },
];

export function ScheduledMessages() {
  const [messages, setMessages] = useState<ScheduledMessage[]>(mockScheduledMessages);
  const [isCreating, setIsCreating] = useState(false);

  const getStatusBadge = (status: ScheduledMessage["status"]) => {
    switch (status) {
      case "scheduled":
        return (
            <Badge className="bg-blue-100 text-blue-700">
              <Clock className="h-3 w-3 mr-1" />
              Scheduled
            </Badge>
        );
      case "sending":
        return <Badge className="bg-yellow-100 text-yellow-700">Sending...</Badge>;
      case "sent":
        return <Badge className="bg-green-100 text-green-700">Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return null;
    }
  };

  const deleteMessage = (id: string) => {
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  const sendNow = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => msg.id === id ? { ...msg, status: "sending" as const } : msg)
    );
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) => msg.id === id ? { ...msg, status: "sent" as const } : msg)
      );
    }, 2000);
  };

  return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl text-gray-900 mt-1">
                    {messages.filter((m) => m.status === "scheduled").length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sent This Week</p>
                  <p className="text-2xl text-gray-900 mt-1">12</p>
                </div>
                <Send className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Next Sending</p>
                  <p className="text-sm text-gray-900 mt-1">Tomorrow 9:00 AM</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create New Button */}
        <div className="flex justify-end">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Type</label>
                    <Select defaultValue="email">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="chat">
                          <div className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Recipient</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Sarah Johnson (Acme Corp)</SelectItem>
                        <SelectItem value="2">Mike Chen (TechStart Inc)</SelectItem>
                        <SelectItem value="3">Alex Kim (DesignCo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Subject (Email only)</label>
                  <Input placeholder="Email subject..." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Message</label>
                  <Textarea placeholder="Type your message..." rows={6} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Send When</label>
                  <Select defaultValue="custom">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1hour">In 1 hour</SelectItem>
                      <SelectItem value="tomorrow-morning">Tomorrow morning (9 AM)</SelectItem>
                      <SelectItem value="tomorrow-afternoon">Tomorrow afternoon (2 PM)</SelectItem>
                      <SelectItem value="next-week">Next Monday (9 AM)</SelectItem>
                      <SelectItem value="custom">Custom date & time...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Date</label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Time</label>
                    <Input type="time" defaultValue="09:00" />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreating(false)}>
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scheduled Messages List */}
        <div className="space-y-4">
          {messages.map((message, index) => (
              <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{message.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-sm text-gray-900">
                              {message.recipient}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {message.client}
                            </Badge>
                            {message.type === "email" ? (
                                <Mail className="h-4 w-4 text-gray-400" />
                            ) : (
                                <MessageSquare className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          {message.subject && (
                              <p className="text-sm text-gray-900 mb-2">
                                {message.subject}
                              </p>
                          )}
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {message.content}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {message.scheduledFor}
                            </div>
                            {getStatusBadge(message.status)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        {message.status === "scheduled" && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendNow(message.id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Now
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMessage(message.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
          ))}
        </div>

        {messages.length === 0 && (
            <Card>
              <CardContent className="py-24 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No scheduled messages</p>
                <p className="text-sm text-gray-500 mt-1">
                  Schedule messages to be sent at the perfect time
                </p>
                <Button className="mt-4" onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Your First Message
                </Button>
              </CardContent>
            </Card>
        )}
      </div>
  );
}
