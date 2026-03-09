"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Search,
  Mail,
  MessageSquare,
  Star,
  Send,
  Sparkles,
  Clock,
  Paperclip,
  MoreVertical,
  Archive,
  Trash2,
  History,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { motion } from "motion/react";
import { AIReplyComposer } from "./AIReplyComposer";
import { AttachmentDialog } from "./AttachmentDialog";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import { MessageThreadDialog } from "./MessageThreadDialog";
import { toast } from "sonner";

interface Message {
  id: string;
  gmailId?: string;
  threadId?: string;
  type: "email" | "chat";
  from: string;
  fromEmail?: string;
  initials: string;
  subject?: string;
  preview: string;
  body?: string;
  timestamp: Date | string;
  unread: boolean;
  starred: boolean;
  archived?: boolean;
  sent?: boolean;
  client: string;
  clientId?: number | null;
  labels?: string[];
  tags: string[];
}

function formatTimestamp(ts: Date | string): string {
  const date = typeof ts === "string" ? new Date(ts) : ts;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function UnifiedInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "email" | "chat">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "starred">("all");
  const [showAIComposer, setShowAIComposer] = useState(false);
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showThreadDialog, setShowThreadDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    checkGoogleConnection();
    fetchEmails();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const res = await fetch("/api/integrations/google");
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.connected === true);
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    }
  };

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("filter", filterStatus);

      const res = await fetch(`/api/gmail/sync?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch emails:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Synced ${data.synced} emails`);
        await fetchEmails();
      } else {
        toast.error("Sync failed");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.preview.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || msg.type === filterType;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "unread" && msg.unread) ||
      (filterStatus === "starred" && msg.starred);

    return matchesSearch && matchesType && matchesStatus;
  });

  const applyAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/gmail/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");

      // Update local state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== id) return msg;
          const updated = { ...msg };
          if (action === "star") updated.starred = true;
          if (action === "unstar") updated.starred = false;
          if (action === "archive") updated.archived = true;
          if (action === "unarchive") updated.archived = false;
          if (action === "markRead") updated.unread = false;
          if (action === "markUnread") updated.unread = true;
          return updated;
        })
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (action === "star") updated.starred = true;
          if (action === "unstar") updated.starred = false;
          if (action === "markRead") updated.unread = false;
          if (action === "markUnread") updated.unread = true;
          return updated;
        });
      }
    } catch {
      toast.error("Action failed");
    }
  };

  const toggleStar = (id: string, currentlyStarred: boolean) => {
    applyAction(id, currentlyStarred ? "unstar" : "star");
  };

  const markAsRead = (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg?.unread) applyAction(id, "markRead");
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setReplyText("");
    setShowAIComposer(false);
    markAsRead(message.id);
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/gmail/messages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
        toast.success("Message deleted");
      } else {
        toast.error("Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedMessage.fromEmail || selectedMessage.from,
          subject: `Re: ${selectedMessage.subject || ""}`,
          bodyHtml: `<p>${replyText.replace(/\n/g, "<br>")}</p>`,
          bodyText: replyText,
          threadId: selectedMessage.threadId,
          replyToGmailId: selectedMessage.gmailId,
        }),
      });
      if (res.ok) {
        toast.success("Reply sent successfully");
        setReplyText("");
        await fetchEmails();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send reply");
      }
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  if (isConnected === false) {
    return (
      <Card>
        <CardContent className="py-24 text-center">
          <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
          <p className="text-gray-700 text-lg mb-2">Gmail not connected</p>
          <p className="text-sm text-gray-500 mb-6">
            Connect your Google account to sync emails and use the inbox.
          </p>
          <Button onClick={() => (window.location.href = "/api/google")}>
            <Mail className="h-4 w-4 mr-2" />
            Connect Gmail
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">
      {/* Message List */}
      <div className="lg:col-span-1 min-h-0 flex flex-col">
        <Card className="flex flex-col flex-1 min-h-0">
          <CardContent className="p-4 flex flex-col flex-1 min-h-0 gap-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchEmails()}
                    className="pl-10"
                  />
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                  title="Sync Gmail"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Messages</SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Only
                      </div>
                    </SelectItem>
                    <SelectItem value="chat">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="starred">Starred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Message List */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No messages found</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync Gmail
                  </Button>
                </div>
              ) : (
                filteredMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSelectMessage(message)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id
                        ? "bg-blue-50 border-blue-200 border"
                        : message.unread
                        ? "bg-gray-50 hover:bg-gray-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback>{message.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm ${
                                message.unread ? "font-semibold" : ""
                              } text-gray-900 truncate`}
                            >
                              {message.from}
                            </span>
                            {message.type === "email" ? (
                              <Mail className="h-3 w-3 text-gray-400" />
                            ) : (
                              <MessageSquare className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(message.id, message.starred);
                            }}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                message.starred
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-400"
                              }`}
                            />
                          </button>
                        </div>
                        {message.subject && (
                          <p
                            className={`text-sm ${
                              message.unread ? "font-medium" : ""
                            } text-gray-700 truncate mb-1`}
                          >
                            {message.subject}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 truncate mb-2">
                          {message.preview}
                        </p>
                        <div className="flex items-center justify-between">
                          {message.client ? (
                            <Badge variant="outline" className="text-xs">
                              {message.client}
                            </Badge>
                          ) : (
                            <span />
                          )}
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Detail & Reply */}
      <div className="lg:col-span-2 min-h-0 flex flex-col">
        {selectedMessage ? (
          <Card className="flex flex-col flex-1 min-h-0">
            <CardContent className="p-6 flex flex-col flex-1 min-h-0 overflow-y-auto gap-6">
              {/* Message Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{selectedMessage.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedMessage.from}
                    </h3>
                    {selectedMessage.fromEmail && (
                      <p className="text-sm text-gray-500">{selectedMessage.fromEmail}</p>
                    )}
                    {selectedMessage.client && (
                      <p className="text-sm text-gray-600">{selectedMessage.client}</p>
                    )}
                    {selectedMessage.subject && (
                      <p className="text-sm text-gray-900 mt-2">{selectedMessage.subject}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge>
                    {selectedMessage.type === "email" ? (
                      <Mail className="h-3 w-3 mr-1" />
                    ) : (
                      <MessageSquare className="h-3 w-3 mr-1" />
                    )}
                    {selectedMessage.type}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowThreadDialog(true)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Thread
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Message Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          applyAction(selectedMessage.id, "archive");
                          setSelectedMessage(null);
                          toast.success("Message archived");
                        }}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          toggleStar(selectedMessage.id, selectedMessage.starred);
                          toast.success(
                            selectedMessage.starred ? "Removed from starred" : "Added to starred"
                          );
                        }}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {selectedMessage.starred ? "Unstar" : "Star"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          applyAction(selectedMessage.id, "markUnread");
                          toast.success("Marked as unread");
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Mark as Unread
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Separator />

              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                {selectedMessage.body ? (
                  <div
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.body }}
                  />
                ) : (
                  <p className="text-gray-700">{selectedMessage.preview}</p>
                )}
              </div>

              {selectedMessage.tags && selectedMessage.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMessage.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              {/* Reply Section */}
              {!showAIComposer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-gray-700">Reply</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAIComposer(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Use AI Draft
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Type your reply..."
                    rows={4}
                    className="resize-none"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAttachmentDialog(true)}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowScheduleDialog(true)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSendReply}
                      disabled={isSending || !replyText.trim()}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Reply
                    </Button>
                  </div>
                </div>
              ) : (
                <AIReplyComposer
                  message={selectedMessage}
                  onClose={() => setShowAIComposer(false)}
                  onSend={async (replyHtml: string) => {
                    setIsSending(true);
                    try {
                      const res = await fetch("/api/gmail/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          to: selectedMessage.fromEmail || selectedMessage.from,
                          subject: `Re: ${selectedMessage.subject || ""}`,
                          bodyHtml: replyHtml,
                          threadId: selectedMessage.threadId,
                          replyToGmailId: selectedMessage.gmailId,
                        }),
                      });
                      if (res.ok) {
                        toast.success("Reply sent successfully");
                        setShowAIComposer(false);
                        await fetchEmails();
                      } else {
                        const data = await res.json();
                        toast.error(data.error || "Failed to send");
                      }
                    } finally {
                      setIsSending(false);
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex flex-col justify-center">
            <CardContent className="py-24 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a message to view</p>
              <p className="text-sm text-gray-500 mt-1">
                Choose from {filteredMessages.length} messages in your inbox
              </p>
              {filteredMessages.length === 0 && !isLoading && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Gmail
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <AttachmentDialog
        open={showAttachmentDialog}
        onOpenChange={setShowAttachmentDialog}
        onAttach={(files) => {
          toast.success(`${files.length} file(s) attached successfully`);
        }}
      />
      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onSchedule={async (schedule) => {
          if (!selectedMessage) return;
          try {
            const scheduledAt = new Date(`${schedule.date.toISOString().split("T")[0]}T${schedule.time}`);
            await fetch("/api/scheduled-emails", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                toEmail: selectedMessage.fromEmail || selectedMessage.from,
                toName: selectedMessage.from,
                subject: `Re: ${selectedMessage.subject || ""}`,
                bodyHtml: `<p>${replyText.replace(/\n/g, "<br>")}</p>`,
                bodyText: replyText,
                scheduledAt: scheduledAt.toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                clientId: selectedMessage.clientId,
              }),
            });
            toast.success(
              `Message scheduled for ${schedule.date.toLocaleDateString()} at ${schedule.time}`
            );
          } catch {
            toast.error("Failed to schedule message");
          }
        }}
      />
      {selectedMessage && (
        <MessageThreadDialog
          open={showThreadDialog}
          onOpenChange={setShowThreadDialog}
          clientName={selectedMessage.from}
          clientInitials={selectedMessage.initials}
          dateRange="Last 30 days"
          totalMessages={5}
        />
      )}
    </div>
  );
}
