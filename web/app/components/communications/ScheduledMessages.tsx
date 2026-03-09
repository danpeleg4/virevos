"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
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
  Clock,
  Plus,
  Calendar,
  Mail,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface ScheduledEmail {
  id: number;
  toEmail: string;
  toName: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  scheduledAt: string;
  timezone: string;
  recurring: string | null;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  clientId: number | null;
  createdAt: string | null;
}

export function ScheduledMessages() {
  const [messages, setMessages] = useState<ScheduledEmail[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formToEmail, setFormToEmail] = useState("");
  const [formToName, setFormToName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");

  useEffect(() => {
    fetchScheduledEmails();
  }, []);

  const fetchScheduledEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/scheduled-emails");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.scheduledEmails || []);
      }
    } catch (err) {
      console.error("Failed to fetch scheduled emails:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "sent":
        return <Badge className="bg-green-100 text-green-700">Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const deleteMessage = async (id: number) => {
    try {
      const res = await fetch(`/api/scheduled-emails?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        toast.success("Scheduled message cancelled");
      } else {
        toast.error("Failed to cancel message");
      }
    } catch {
      toast.error("Failed to cancel message");
    }
  };

  const sendNow = async (msg: ScheduledEmail) => {
    try {
      // Send via Gmail immediately
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: msg.toEmail,
          toName: msg.toName,
          subject: msg.subject,
          bodyHtml: msg.bodyHtml,
          bodyText: msg.bodyText,
        }),
      });

      if (res.ok) {
        // Delete the scheduled entry
        await fetch(`/api/scheduled-emails?id=${msg.id}`, { method: "DELETE" });
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        toast.success("Message sent successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleSchedule = async () => {
    if (!formToEmail || !formSubject || !formBody || !formDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const scheduledAt = new Date(`${formDate}T${formTime}`).toISOString();
      const res = await fetch("/api/scheduled-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: formToEmail,
          toName: formToName || undefined,
          subject: formSubject,
          bodyHtml: `<p>${formBody.replace(/\n/g, "<br>")}</p>`,
          bodyText: formBody,
          scheduledAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (res.ok) {
        toast.success("Message scheduled successfully");
        setIsCreating(false);
        setFormToEmail("");
        setFormToName("");
        setFormSubject("");
        setFormBody("");
        setFormDate("");
        setFormTime("09:00");
        await fetchScheduledEmails();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to schedule message");
      }
    } catch {
      toast.error("Failed to schedule message");
    } finally {
      setIsSaving(false);
    }
  };

  const scheduledCount = messages.filter((m) => m.status === "pending").length;
  const sentThisWeek = messages.filter((m) => {
    if (m.status !== "sent" || !m.sentAt) return false;
    const sentDate = new Date(m.sentAt);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return sentDate >= oneWeekAgo;
  }).length;

  const nextScheduled = messages
    .filter((m) => m.status === "pending")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl text-gray-900 mt-1">{scheduledCount}</p>
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
                <p className="text-2xl text-gray-900 mt-1">{sentThisWeek}</p>
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
                <p className="text-sm text-gray-900 mt-1">
                  {nextScheduled
                    ? new Date(nextScheduled.scheduledAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "None scheduled"}
                </p>
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
                  <label className="text-sm text-gray-700">Recipient Email *</label>
                  <Input
                    placeholder="recipient@example.com"
                    value={formToEmail}
                    onChange={(e) => setFormToEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Recipient Name</label>
                  <Input
                    placeholder="John Doe"
                    value={formToName}
                    onChange={(e) => setFormToName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Subject *</label>
                <Input
                  placeholder="Email subject..."
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Message *</label>
                <Textarea
                  placeholder="Type your message..."
                  rows={6}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Date *</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Time</label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSchedule} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Schedule Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Messages List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
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
                        <AvatarFallback>
                          {(message.toName || message.toEmail)
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0]?.toUpperCase())
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-sm text-gray-900">
                            {message.toName || message.toEmail}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {message.toEmail}
                          </Badge>
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{message.subject}</p>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {message.bodyText ||
                            message.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200)}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(message.scheduledAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                          {getStatusBadge(message.status)}
                          {message.errorMessage && (
                            <span className="text-red-500 text-xs">{message.errorMessage}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {message.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendNow(message)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Now
                        </Button>
                      )}
                      {message.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && messages.length === 0 && (
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
