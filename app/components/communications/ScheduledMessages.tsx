"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Clock,
  Plus,
  Mail,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  CheckIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import axios from "axios";
import type { ScheduledEmail } from "@/types/communications";
import {
  createScheduledEmail,
  deleteScheduledEmail,
} from "@/lib/scheduled_emails";
import { sendOutlookEmail } from "@/lib/outlook/outlook_actions";

interface ScheduledMessagesProps {
  navContainer: HTMLDivElement | null;
}

export function ScheduledMessages({ navContainer }: ScheduledMessagesProps) {
  const [messages, setMessages] = useState<ScheduledEmail[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "sent" | "failed"
  >("all");

  // Form state
  const [formToEmail, setFormToEmail] = useState("");
  const [formToName, setFormToName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");

  const checkOutlookConnection = async () => {
    const { data } = await axios.get("/api/integrations/outlook");
    return data.connected;
  };

  const checkConnection = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/integrations/google");
      const outlookData = await checkOutlookConnection();
      setIsConnected(data.connected === true || outlookData);
    } catch {
      setIsConnected(false);
    }
  }, []);

  const fetchScheduledEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get("/api/scheduled-emails");
      setMessages(data.scheduledEmails || []);
    } catch (err) {
      console.error("Failed to fetch scheduled emails:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    void fetchScheduledEmails();
  }, [checkConnection, fetchScheduledEmails]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="h-3 w-3" />
            Scheduled
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Sent
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted/50 text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  const deleteMessage = async (id: number) => {
    try {
      await deleteScheduledEmail(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success("Scheduled message cancelled");
    } catch {
      toast.error("Failed to cancel message");
    }
  };

  const sendNow = async (msg: ScheduledEmail) => {
    try {
      await sendOutlookEmail({
        to: msg.toEmail,
        toName: msg.toName ?? undefined,
        subject: msg.subject,
        bodyHtml: msg.bodyHtml,
        bodyText: msg.bodyText ?? undefined,
      });
      await deleteScheduledEmail(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      toast.success("Message sent successfully");
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
      const data = await createScheduledEmail({
        toEmail: formToEmail,
        toName: formToName || undefined,
        subject: formSubject,
        bodyHtml: `<p>${formBody.replace(/\n/g, "<br>")}</p>`,
        bodyText: formBody,
        scheduledAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (data) {
        toast.success("Message scheduled successfully");
        setIsCreating(false);
        setFormToEmail("");
        setFormToName("");
        setFormSubject("");
        setFormBody("");
        setFormDate("");
        setFormTime("09:00");
        await fetchScheduledEmails();
      }
    } catch {
      toast.error("Failed to schedule message");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      searchQuery === "" ||
      msg.toEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.toName &&
        msg.toName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isConnected === false) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
        <p className="text-foreground text-lg mb-2">Email not connected</p>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your Email account to sync emails and use the inbox.
        </p>
        <Button onClick={() => (window.location.href = "/api/outlook")}>
          <Mail className="h-4 w-4 mr-2" />
          Connect Email
        </Button>
      </div>
    );
  }

  const statusFilterLabel =
    statusFilter === "all"
      ? "All Status"
      : statusFilter === "pending"
        ? "Scheduled"
        : statusFilter === "sent"
          ? "Sent"
          : "Failed";

  const navActions = (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search scheduled..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm w-48"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {statusFilterLabel}
            {statusFilter !== "all" && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["all", "pending", "sent", "failed"] as const).map((v) => (
            <DropdownMenuItem
              key={v}
              onClick={() => setStatusFilter(v)}
              className="flex items-center justify-between cursor-pointer"
            >
              {v === "all"
                ? "All Status"
                : v === "pending"
                  ? "Scheduled"
                  : v === "sent"
                    ? "Sent"
                    : "Failed"}
              {statusFilter === v && (
                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Schedule Message
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule New Message</DialogTitle>
            <DialogDescription>
              Schedule a message to be sent at a specific date and time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground">
                  Recipient Email *
                </label>
                <Input
                  placeholder="recipient@example.com"
                  value={formToEmail}
                  onChange={(e) => setFormToEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground">
                  Recipient Name
                </label>
                <Input
                  placeholder="John Doe"
                  value={formToName}
                  onChange={(e) => setFormToName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Subject *</label>
              <Input
                placeholder="Email subject..."
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Message *</label>
              <Textarea
                placeholder="Type your message..."
                rows={6}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground">Date *</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground">Time</label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-border">
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
    </>
  );

  return (
    <div className="overflow-y-auto h-full p-4 sm:p-6">
      {navContainer && createPortal(navActions, navContainer)}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="py-24 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {messages.length === 0
              ? "No scheduled messages"
              : "No messages match your filters"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {messages.length === 0
              ? "Schedule messages to be sent at the perfect time"
              : "Try adjusting your search or filter"}
          </p>
          {messages.length === 0 && (
            <Button className="mt-4" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Your First Message
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="p-6">
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
                        <h3 className="text-sm text-foreground">
                          {message.toName || message.toEmail}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-foreground rounded-full px-2.5 py-0.5">
                          {message.toEmail}
                        </span>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-foreground mb-2">
                        {message.subject}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {message.bodyText ||
                          message.bodyHtml
                            .replace(/<[^>]*>/g, "")
                            .slice(0, 200)}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(message.scheduledAt).toLocaleString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                        {getStatusBadge(message.status)}
                        {message.errorMessage && (
                          <span className="text-red-500 text-xs">
                            {message.errorMessage}
                          </span>
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
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
