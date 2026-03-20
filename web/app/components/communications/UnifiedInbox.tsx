"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
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
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  X,
  FileText,
  Image,
  File,
  Link2,
  CheckIcon,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { motion } from "motion/react";
import { AIReplyComposer } from "./AIReplyComposer";
import { AttachmentDialog } from "./AttachmentDialog";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import { ComposeMessageDialog } from "./ComposeMessageDialog";
import { toast } from "sonner";
import axios from "axios";
import type {
  InboxMessage,
  AttachedFile,
  ScheduleDetails,
} from "@/types/communications";

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

interface UnifiedInboxProps {
  navContainer: HTMLDivElement | null;
}

const PAGE_LIMIT = 50;

interface EmailsPage {
  messages: InboxMessage[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export function UnifiedInbox({ navContainer }: UnifiedInboxProps) {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAIComposer, setShowAIComposer] = useState(false);
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [replyText, setReplyText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachedFile[]>(
    []
  );
  const [pendingSchedule, setPendingSchedule] =
    useState<ScheduleDetails | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const emailsQueryKey = ["emails", debouncedSearch, filterStatus] as const;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery<EmailsPage>({
    queryKey: emailsQueryKey,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_LIMIT),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterStatus !== "all") params.set("filter", filterStatus);
      const { data } = await axios.get<EmailsPage>(`/api/gmail/sync?${params}`);
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const allMessages = data?.pages.flatMap((p) => p.messages) ?? [];

  // Intersection observer to load next page when sentinel is visible
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const { data } = await axios.get("/api/integrations/google");
      setIsConnected(data.connected === true);
    } catch {
      setIsConnected(false);
    }
  };

  const updateMessageInCache = useCallback(
    (id: string, updater: (msg: InboxMessage) => InboxMessage) => {
      queryClient.setQueryData<{ pages: EmailsPage[]; pageParams: unknown[] }>(
        emailsQueryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === id ? updater(msg) : msg
              ),
            })),
          };
        }
      );
    },
    [queryClient, emailsQueryKey]
  );

  const removeMessageFromCache = useCallback(
    (id: string) => {
      queryClient.setQueryData<{ pages: EmailsPage[]; pageParams: unknown[] }>(
        emailsQueryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((msg) => msg.id !== id),
            })),
          };
        }
      );
    },
    [queryClient, emailsQueryKey]
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data } = await axios.post("/api/gmail/sync");
      toast.success(`Synced ${data.synced} emails`);
      await refetch();
    } catch {
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredMessages = allMessages.filter((msg) => {
    return filterType === "all" || msg.type === filterType;
  });

  const applyAction = async (id: string, action: string) => {
    try {
      await axios.patch(`/api/gmail/messages/${id}`, { action });

      const updater = (msg: InboxMessage): InboxMessage => {
        const updated = { ...msg };
        if (action === "star") updated.starred = true;
        if (action === "unstar") updated.starred = false;
        if (action === "archive") updated.archived = true;
        if (action === "unarchive") updated.archived = false;
        if (action === "markRead") updated.unread = false;
        if (action === "markUnread") updated.unread = true;
        return updated;
      };

      updateMessageInCache(id, updater);

      if (selectedMessage?.id === id) {
        setSelectedMessage((prev) => (prev ? updater(prev) : prev));
      }
    } catch {
      toast.error("Action failed");
    }
  };

  const toggleStar = (id: string, currentlyStarred: boolean) => {
    applyAction(id, currentlyStarred ? "unstar" : "star");
  };

  const markAsRead = (id: string) => {
    const msg = allMessages.find((m) => m.id === id);
    if (msg?.unread) applyAction(id, "markRead");
  };

  const handleSelectMessage = (message: InboxMessage) => {
    setSelectedMessage(message);
    setReplyText("");
    setPendingAttachments([]);
    setPendingSchedule(null);
    setShowAIComposer(false);
    markAsRead(message.id);
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await axios.delete(`/api/gmail/messages/${id}`);
      removeMessageFromCache(id);
      if (selectedMessage?.id === id) setSelectedMessage(null);
      toast.success("Message deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSending(true);
    try {
      if (pendingSchedule) {
        const scheduledAt = new Date(
          `${pendingSchedule.date.toISOString().split("T")[0]}T${pendingSchedule.time}`
        );
        await axios.post("/api/scheduled-emails", {
          toEmail: selectedMessage.fromEmail || selectedMessage.from,
          toName: selectedMessage.from,
          subject: `Re: ${selectedMessage.subject || ""}`,
          bodyHtml: `<p>${replyText.replace(/\n/g, "<br>")}</p>`,
          bodyText: replyText,
          scheduledAt: scheduledAt.toISOString(),
          timezone: pendingSchedule.timezone,
          clientId: selectedMessage.clientId,
        });
        toast.success(
          `Reply scheduled for ${pendingSchedule.date.toLocaleDateString()} at ${pendingSchedule.time}`
        );
        setReplyText("");
        setPendingAttachments([]);
        setPendingSchedule(null);
      } else {
        await axios.post("/api/gmail/send", {
          to: selectedMessage.fromEmail || selectedMessage.from,
          subject: `Re: ${selectedMessage.subject || ""}`,
          bodyHtml: `<p>${replyText.replace(/\n/g, "<br>")}</p>`,
          bodyText: replyText,
          threadId: selectedMessage.threadId,
          replyToGmailId: selectedMessage.gmailId,
          attachments: pendingAttachments
            .filter((f) => f.path || f.url)
            .map((f) => ({ name: f.name, url: f.url, path: f.path })),
        });
        toast.success("Reply sent successfully");
        setReplyText("");
        setPendingAttachments([]);
        await refetch();
      }
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  if (isConnected === false) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
        <p className="text-gray-700 text-lg mb-2">Gmail not connected</p>
        <p className="text-sm text-gray-500 mb-6">
          Connect your Google account to sync emails and use the inbox.
        </p>
        <Button onClick={() => (window.location.href = "/api/google")}>
          <Mail className="h-4 w-4 mr-2" />
          Connect Gmail
        </Button>
      </div>
    );
  }

  const navActions = (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setDebouncedSearch(searchQuery)}
          className="pl-8 h-8 text-sm w-44"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-2.5 py-1.5 transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filterType === "all"
              ? "Type"
              : filterType === "email"
                ? "Email"
                : "Chat"}
            {filterType !== "all" && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["all", "email", "chat"] as const).map((v) => (
            <DropdownMenuItem
              key={v}
              onClick={() => setFilterType(v)}
              className="flex items-center justify-between cursor-pointer"
            >
              {v === "all"
                ? "All Messages"
                : v === "email"
                  ? "Email Only"
                  : "Chat Only"}
              {filterType === v && (
                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-2.5 py-1.5 transition-colors">
            <ArrowUpDown className="h-3.5 w-3.5" />
            {filterStatus === "all"
              ? "Status"
              : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            {filterStatus !== "all" && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["all", "unread", "starred", "archived"] as const).map((v) => (
            <DropdownMenuItem
              key={v}
              onClick={() => setFilterStatus(v)}
              className="flex items-center justify-between cursor-pointer"
            >
              {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
              {filterStatus === v && (
                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="icon"
        variant="outline"
        onClick={handleSync}
        disabled={isSyncing}
        title="Sync Gmail"
        className="h-8 w-8 flex-shrink-0"
      >
        {isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={() => setShowComposeDialog(true)}
        title="Compose new message"
        className="h-8 w-8 flex-shrink-0"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </>
  );

  return (
    <div className="flex gap-6" style={{ flex: "1 1 0%", minHeight: 0 }}>
      {navContainer && createPortal(navActions, navContainer)}

      {/* Message List */}
      <div
        className="flex flex-col"
        style={{ width: "33.333%", minHeight: 0, flexShrink: 0 }}
      >
        <div
          className="flex flex-col overflow-hidden"
          style={{ flex: "1 1 0%", minHeight: 0 }}
        >
          {/* Message List */}
          <div
            className="overflow-y-auto overflow-x-hidden p-3 space-y-2"
            style={{ flex: "1 1 0%", minHeight: 0 }}
          >
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
              <>
                {filteredMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
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
                              className={`h-4 w-4 cursor-pointer ${
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
                ))}
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="py-1" />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Message Detail & Reply */}
      <div
        className="flex flex-col overflow-y-auto space-y-2"
        style={{ flex: "1 1 0%", minHeight: 0 }}
      >
        {selectedMessage ? (
          <div
            className="flex flex-col"
            style={{ flex: "1 1 0%", minHeight: 0 }}
          >
            <div className="p-6 flex flex-col flex-1 gap-6">
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
                      <p className="text-sm text-gray-500">
                        {selectedMessage.fromEmail}
                      </p>
                    )}
                    {selectedMessage.client && (
                      <p className="text-sm text-gray-600">
                        {selectedMessage.client}
                      </p>
                    )}
                    {selectedMessage.subject && (
                      <p className="text-sm text-gray-900 mt-2">
                        {selectedMessage.subject}
                      </p>
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
                        className="cursor-pointer"
                        onClick={() => {
                          applyAction(
                            selectedMessage.id,
                            selectedMessage.archived ? "unarchive" : "archive"
                          );
                          if (!selectedMessage.archived)
                            setSelectedMessage(null);
                          toast.success(
                            selectedMessage.archived
                              ? "Message unarchived"
                              : "Message archived"
                          );
                        }}
                      >
                        <Archive
                          className={`h-4 w-4 mr-2 ${selectedMessage.archived ? "fill-blue-500 text-blue-500" : ""}`}
                        />
                        {selectedMessage.archived ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          toggleStar(
                            selectedMessage.id,
                            selectedMessage.starred
                          );
                          toast.success(
                            selectedMessage.starred
                              ? "Removed from starred"
                              : "Added to starred"
                          );
                        }}
                      >
                        <Star
                          className={`h-4 w-4 mr-2 ${selectedMessage.starred ? "fill-yellow-400 text-yellow-400" : ""}`}
                        />
                        {selectedMessage.starred ? "Unstar" : "Star"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          applyAction(
                            selectedMessage.id,
                            selectedMessage.unread ? "markRead" : "markUnread"
                          );
                          toast.success(
                            selectedMessage.unread
                              ? "Marked as read"
                              : "Marked as unread"
                          );
                        }}
                      >
                        <Mail
                          className={`h-4 w-4 mr-2 ${selectedMessage.unread ? "fill-blue-500 text-blue-500" : ""}`}
                        />
                        {selectedMessage.unread
                          ? "Mark as Read"
                          : "Mark as Unread"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600"
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

              {/* Conversation History */}
              {(() => {
                const threadMessages = selectedMessage.threadId
                  ? allMessages
                      .filter(
                        (m) =>
                          m.threadId === selectedMessage.threadId &&
                          m.id !== selectedMessage.id
                      )
                      .sort(
                        (a, b) =>
                          new Date(a.timestamp).getTime() -
                          new Date(b.timestamp).getTime()
                      )
                  : [];

                if (threadMessages.length === 0) return null;

                return (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Conversation History ({threadMessages.length} message
                      {threadMessages.length !== 1 ? "s" : ""})
                    </h4>
                    <div className="space-y-2">
                      {threadMessages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-lg border p-3 text-sm ${
                            msg.sent
                              ? "bg-blue-50 border-blue-100 ml-6"
                              : "bg-gray-50 border-gray-100 mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {msg.from}
                              </span>
                              {msg.type === "email" ? (
                                <Mail className="h-3 w-3 text-gray-400" />
                              ) : (
                                <MessageSquare className="h-3 w-3 text-gray-400" />
                              )}
                              {msg.subject && (
                                <span className="text-gray-500 truncate max-w-48">
                                  {msg.subject}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-gray-600 line-clamp-3">
                            {msg.preview}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                );
              })()}

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
                  {(pendingAttachments.length > 0 || pendingSchedule) && (
                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border">
                      {pendingAttachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-1.5 bg-white border rounded-md px-2 py-1 text-xs text-gray-700"
                        >
                          {file.type === "document" ? (
                            <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          ) : file.type === "image" ? (
                            <Image className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          ) : file.url?.startsWith("http") && !file.path ? (
                            <Link2 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                          ) : (
                            <File className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="max-w-32 truncate">{file.name}</span>
                          <span className="text-gray-400">{file.size}</span>
                          <button
                            onClick={() =>
                              setPendingAttachments((prev) =>
                                prev.filter((f) => f.id !== file.id)
                              )
                            }
                            className="ml-0.5 hover:bg-gray-100 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {pendingSchedule && (
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-xs text-blue-700">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            {pendingSchedule.date.toLocaleDateString()} at{" "}
                            {pendingSchedule.time}
                          </span>
                          <button
                            onClick={() => setPendingSchedule(null)}
                            className="ml-0.5 hover:bg-blue-100 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAttachmentDialog(true)}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach
                        {pendingAttachments.length > 0 && (
                          <Badge className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-xs bg-blue-500">
                            {pendingAttachments.length}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={pendingSchedule ? "default" : "outline"}
                        onClick={() => setShowScheduleDialog(true)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {pendingSchedule ? "Change Schedule" : "Schedule"}
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
                      {pendingSchedule ? "Schedule Reply" : "Send Reply"}
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
                      await axios.post("/api/gmail/send", {
                        to: selectedMessage.fromEmail || selectedMessage.from,
                        subject: `Re: ${selectedMessage.subject || ""}`,
                        bodyHtml: replyHtml,
                        threadId: selectedMessage.threadId,
                        replyToGmailId: selectedMessage.gmailId,
                      });
                      toast.success("Reply sent successfully");
                      setShowAIComposer(false);
                      await refetch();
                    } catch (err) {
                      const error = err as {
                        response?: { data?: { error?: string } };
                      };
                      toast.error(
                        error.response?.data?.error || "Failed to send"
                      );
                    } finally {
                      setIsSending(false);
                    }
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
            <div className="py-24 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a message to view</p>
              <p className="text-sm text-gray-500 mt-1">
                Choose from {filteredMessages.length} loaded message{filteredMessages.length !== 1 ? "s" : ""} in your inbox
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
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ComposeMessageDialog
        open={showComposeDialog}
        onOpenChange={setShowComposeDialog}
        onSent={() => refetch()}
      />
      <AttachmentDialog
        open={showAttachmentDialog}
        onOpenChange={setShowAttachmentDialog}
        onAttach={(files) => {
          setPendingAttachments((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const newFiles = files.filter((f) => !existingIds.has(f.id));
            return [...prev, ...newFiles];
          });
          toast.success(`${files.length} file(s) ready to attach`);
        }}
      />
      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onSchedule={(schedule) => {
          setPendingSchedule(schedule);
          setShowScheduleDialog(false);
        }}
      />
    </div>
  );
}
