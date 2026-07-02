"use client";

import { useState, useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  Image as ImageIcon,
  File,
  Link2,
  CheckIcon,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { AIReplyComposer } from "./AIReplyComposer";
import { AttachmentDialog } from "./AttachmentDialog";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import { ComposeMessageDialog } from "./ComposeMessageDialog";
import { PortalChatPane } from "./PortalChatPane";
import { toast } from "sonner";
import axios from "axios";
import type {
  InboxMessage,
  AttachedFile,
  ScheduleDetails,
} from "@/types/communications";
import type { PortalChatConversation } from "@/types/portal";
import {
  deleteOutlookMessage,
  sendOutlookEmail,
  syncOutlookInbox,
  updateOutlookMessage,
} from "@/lib/outlook/outlook_actions";
import { deletePortalChat, updatePortalChat } from "@/lib/portal_chat";
import { createScheduledEmail } from "@/lib/scheduled_emails";

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
  const [replyText, setReplyText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachedFile[]>(
    []
  );
  const [pendingSchedule, setPendingSchedule] =
    useState<ScheduleDetails | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const emailIframeRef = useRef<HTMLIFrameElement>(null);
  const [emailIframeHeight, setEmailIframeHeight] = useState(400);

  interface OutlookAttachmentMeta {
    id: string;
    name: string;
    size: number;
    contentType: string;
  }

  const { data: connected } = useQuery({
    queryKey: ["email-connection"],
    queryFn: async () => {
      const res = await axios.get("/api/integrations/outlook");
      return res.data.connected;
    },
  });

  const { data: attachmentsData } = useQuery<OutlookAttachmentMeta[]>({
    queryKey: ["outlook-attachments", selectedMessage?.id],
    queryFn: async () => {
      const res = await axios.get<{ attachments: OutlookAttachmentMeta[] }>(
        `/api/outlook/messages/${selectedMessage!.id}/attachments`
      );
      return res.data.attachments;
    },
    enabled: !!selectedMessage?.id && selectedMessage.type === "email",
  });

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
      const { data } = await axios.get<EmailsPage>(
        `/api/outlook/sync?${params}`
      );
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const { data: portalChatsData } = useQuery<{
    conversations: PortalChatConversation[];
  }>({
    queryKey: ["portal-chat-conversations"],
    queryFn: async () => {
      const res = await axios.get("/api/portal-chat");
      return res.data;
    },
    refetchInterval: 5000,
  });

  const portalChatRows: InboxMessage[] = (() => {
    const convos = portalChatsData?.conversations ?? [];
    const rows = convos
      .filter((c) => c.lastMessage !== null)
      .map((c) => {
        const initials = c.clientName
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0] || "")
          .join("")
          .toUpperCase();
        return {
          id: `portal-chat-${c.clientId}`,
          type: "chat" as const,
          from: c.clientName,
          fromEmail: c.clientEmail ?? undefined,
          initials,
          preview: c.lastMessage ?? "",
          timestamp: c.lastMessageAt ?? new Date().toISOString(),
          unread: c.unreadCount > 0,
          starred: c.starred,
          archived: c.archived,
          sent: false,
          hasAttachments: false,
          client: c.clientName,
          clientId: c.clientId,
          tags: [],
        } satisfies InboxMessage;
      });

    // Mirror the email-side filterStatus semantics for chat rows.
    if (filterStatus === "archived") return rows.filter((r) => r.archived);
    const visible = rows.filter((r) => !r.archived);
    if (filterStatus === "unread") return visible.filter((r) => r.unread);
    if (filterStatus === "starred") return visible.filter((r) => r.starred);
    if (filterStatus === "sent") return [];
    return visible;
  })();

  const emails = data?.pages.flatMap((p) => p.messages) ?? [];
  const allMessages = [...portalChatRows, ...emails].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Intersection observer to load next page when sentinel is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateMessageInCache = (
    id: string,
    updater: (msg: InboxMessage) => InboxMessage
  ) => {
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
  };

  const removeMessageFromCache = (id: string) => {
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
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncOutlookInbox();
      toast.success("Emails synced successfully");
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

  const updateChatConvoInCache = (
    clientId: number,
    updater: (c: PortalChatConversation) => PortalChatConversation
  ) => {
    queryClient.setQueryData<{ conversations: PortalChatConversation[] }>(
      ["portal-chat-conversations"],
      (old) => {
        if (!old) return old;
        return {
          conversations: old.conversations.map((c) =>
            c.clientId === clientId ? updater(c) : c
          ),
        };
      }
    );
  };

  const applyAction = async (id: string, action: string) => {
    if (id.startsWith("portal-chat-")) {
      const clientId = Number(id.replace("portal-chat-", ""));
      if (!Number.isFinite(clientId)) return;

      const prev = queryClient.getQueryData<{
        conversations: PortalChatConversation[];
      }>(["portal-chat-conversations"]);
      const previousSelected = selectedMessage;

      // Optimistic update of the conversation row + selected pane
      const convoUpdater = (c: PortalChatConversation) => {
        if (action === "star") return { ...c, starred: true };
        if (action === "unstar") return { ...c, starred: false };
        if (action === "archive") return { ...c, archived: true };
        if (action === "unarchive") return { ...c, archived: false };
        if (action === "markUnread")
          return {
            ...c,
            unreadCount: c.unreadCount > 0 ? c.unreadCount : 1,
          };
        return c;
      };
      updateChatConvoInCache(clientId, convoUpdater);
      if (selectedMessage?.id === id) {
        setSelectedMessage((prevSel) => {
          if (!prevSel) return prevSel;
          const next = { ...prevSel };
          if (action === "star") next.starred = true;
          if (action === "unstar") next.starred = false;
          if (action === "archive") next.archived = true;
          if (action === "unarchive") next.archived = false;
          if (action === "markUnread") next.unread = true;
          return next;
        });
      }

      try {
        await updatePortalChat(clientId, action);
        // Mark Unread: drop selection so the chat pane GET doesn't immediately
        // re-mark as read on its next poll.
        if (action === "markUnread" && selectedMessage?.id === id) {
          setSelectedMessage(null);
        }
      } catch {
        if (prev) {
          queryClient.setQueryData(["portal-chat-conversations"], prev);
        }
        setSelectedMessage(previousSelected);
        toast.error("Action failed");
      }
      return;
    }
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

    // Snapshot for rollback
    const previousData = queryClient.getQueryData(emailsQueryKey);
    const previousSelected = selectedMessage;

    // Optimistic update
    updateMessageInCache(id, updater);
    if (selectedMessage?.id === id) {
      setSelectedMessage((prev) => (prev ? updater(prev) : prev));
    }

    try {
      await updateOutlookMessage(Number(id), action);
    } catch {
      // Revert optimistic update on failure
      queryClient.setQueryData(emailsQueryKey, previousData);
      setSelectedMessage(previousSelected);
      toast.error("Action failed");
    }
  };

  const toggleStar = async (id: string, currentlyStarred: boolean) => {
    await applyAction(id, currentlyStarred ? "unstar" : "star");
  };

  const markAsRead = async (id: string) => {
    const msg = allMessages.find((m) => m.id === id);
    if (msg?.unread) await applyAction(id, "markRead");
  };

  const handleSelectMessage = async (message: InboxMessage) => {
    setSelectedMessage(message);
    setEmailIframeHeight(400);
    setReplyText("");
    setPendingAttachments([]);
    setPendingSchedule(null);
    setShowAIComposer(false);
    await markAsRead(message.id);
  };

  const handleDeleteMessage = async (id: string) => {
    if (id.startsWith("portal-chat-")) {
      const clientId = Number(id.replace("portal-chat-", ""));
      if (!Number.isFinite(clientId)) return;
      const confirmed = window.confirm(
        "Delete this entire chat? Messages will be removed for both you and the client."
      );
      if (!confirmed) return;
      try {
        await deletePortalChat(clientId);
        if (selectedMessage?.id === id) setSelectedMessage(null);
        await queryClient.invalidateQueries({
          queryKey: ["portal-chat-conversations"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["portal-chat-thread", clientId],
        });
        toast.success("Chat deleted");
      } catch {
        toast.error("Delete failed");
      }
      return;
    }
    try {
      await deleteOutlookMessage(Number(id));
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
        await createScheduledEmail({
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
        await sendOutlookEmail({
          to: selectedMessage.fromEmail || selectedMessage.from,
          subject: `Re: ${selectedMessage.subject || ""}`,
          bodyHtml: `<p>${replyText.replace(/\n/g, "<br>")}</p>`,
          bodyText: replyText,
          threadId: selectedMessage.threadId,
          replyToOutlookId: selectedMessage.outlookId,
          attachments: pendingAttachments
            .filter((f) => f.path || f.url || f.data)
            .map((f) => ({
              name: f.name,
              url: f.url,
              path: f.path,
              data: f.data,
              mimeType: f.mimeType,
            })),
        });
        toast.success("Reply sent successfully");
        setReplyText("");
        setPendingAttachments([]);
        await refetch();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  if (connected === false) {
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

  const navActions = (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && setDebouncedSearch(searchQuery)
          }
          className="pl-8 h-8 text-sm w-44"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-2.5 py-1.5 transition-colors">
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
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-2.5 py-1.5 transition-colors">
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
          {(["all", "unread", "starred", "sent", "archived"] as const).map(
            (v) => (
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
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="icon"
        variant="outline"
        onClick={handleSync}
        disabled={isSyncing}
        title="Sync Emails"
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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No messages found
                </p>
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
                  Sync Messages
                </Button>
              </div>
            ) : (
              <>
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={async () => await handleSelectMessage(message)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id
                        ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 border"
                        : message.unread
                          ? "bg-muted/50 hover:bg-accent"
                          : "hover:bg-muted/50"
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
                              } text-foreground truncate`}
                            >
                              {message.from}
                            </span>
                            {message.type === "email" ? (
                              <Mail className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await toggleStar(message.id, message.starred);
                            }}
                          >
                            <Star
                              className={`h-4 w-4 cursor-pointer ${
                                message.starred
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        </div>
                        {message.subject && (
                          <p
                            className={`text-sm ${
                              message.unread ? "font-medium" : ""
                            } text-foreground truncate mb-1`}
                          >
                            {message.subject}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {message.preview}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {message.client ? (
                              <Badge variant="outline" className="text-xs">
                                {message.client}
                              </Badge>
                            ) : null}
                            {message.sent && (
                              <Badge
                                variant="secondary"
                                className="text-xs gap-1"
                              >
                                <Send className="h-2.5 w-2.5" />
                                Sent
                              </Badge>
                            )}
                            {message.hasAttachments && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="py-1" />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
        {selectedMessage && selectedMessage.type === "chat" ? (
          <div
            className="flex flex-col"
            style={{ flex: "1 1 0%", minHeight: 0 }}
          >
            <div className="px-6 pt-6 pb-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{selectedMessage.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {selectedMessage.from}
                  </h3>
                  {selectedMessage.fromEmail && (
                    <p className="text-xs text-muted-foreground">
                      {selectedMessage.fromEmail}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Portal chat
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Chat Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={async () => {
                        const wasArchived = !!selectedMessage.archived;
                        await applyAction(
                          selectedMessage.id,
                          wasArchived ? "unarchive" : "archive"
                        );
                        if (!wasArchived) setSelectedMessage(null);
                        toast.success(
                          wasArchived ? "Chat unarchived" : "Chat archived"
                        );
                      }}
                    >
                      <Archive
                        className={`h-4 w-4 mr-2 ${
                          selectedMessage.archived
                            ? "fill-blue-500 text-blue-500"
                            : ""
                        }`}
                      />
                      {selectedMessage.archived ? "Unarchive" : "Archive"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={async () => {
                        await applyAction(
                          selectedMessage.id,
                          selectedMessage.starred ? "unstar" : "star"
                        );
                        toast.success(
                          selectedMessage.starred
                            ? "Removed from starred"
                            : "Added to starred"
                        );
                      }}
                    >
                      <Star
                        className={`h-4 w-4 mr-2 ${
                          selectedMessage.starred
                            ? "fill-yellow-400 text-yellow-400"
                            : ""
                        }`}
                      />
                      {selectedMessage.starred ? "Unstar" : "Star"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={async () => {
                        await applyAction(selectedMessage.id, "markUnread");
                        toast.success("Marked as unread");
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Mark as Unread
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
            {selectedMessage.clientId != null ? (
              <PortalChatPane
                clientId={selectedMessage.clientId}
                clientName={selectedMessage.from}
                clientInitials={selectedMessage.initials}
              />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                This conversation is missing a client link.
              </div>
            )}
          </div>
        ) : selectedMessage ? (
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
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedMessage.from}
                    </h3>
                    {selectedMessage.fromEmail && (
                      <p className="text-sm text-muted-foreground">
                        {selectedMessage.fromEmail}
                      </p>
                    )}
                    {selectedMessage.client && (
                      <p className="text-sm text-muted-foreground">
                        {selectedMessage.client}
                      </p>
                    )}
                    {selectedMessage.subject && (
                      <p className="text-sm text-foreground mt-2">
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
                        onClick={async () => {
                          await applyAction(
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
                        onClick={async () => {
                          await toggleStar(
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
                        onClick={async () => {
                          await applyAction(
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

              {/* Message Content — rendered in a sandboxed iframe so email
                  <style> blocks cannot get into the parent page */}
              <div className="text-foreground">
                {selectedMessage.body ? (
                  <iframe
                    ref={emailIframeRef}
                    srcDoc={selectedMessage.body}
                    sandbox="allow-same-origin"
                    title="Email content"
                    className="w-full border-0 block"
                    style={{ height: emailIframeHeight }}
                    onLoad={() => {
                      const body =
                        emailIframeRef.current?.contentDocument?.body;
                      if (body) {
                        setEmailIframeHeight(body.scrollHeight + 32);
                      }
                    }}
                  />
                ) : (
                  <p className="text-foreground">{selectedMessage.preview}</p>
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

              {/* Attachments — always fetched for Outlook emails; panel only renders when results arrive */}
              {selectedMessage.type === "email" &&
                (attachmentsData ?? []).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attachments
                    </h4>

                    {/* Inline image previews */}
                    {attachmentsData!.some((att) =>
                      att.contentType.startsWith("image/")
                    ) && (
                      <div className="flex flex-wrap gap-3">
                        {attachmentsData!
                          .filter((att) => att.contentType.startsWith("image/"))
                          .map((att) => (
                            <a
                              key={att.id}
                              href={`/api/outlook/messages/${selectedMessage.id}/attachments?attachmentId=${encodeURIComponent(att.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={att.name}
                              className="block rounded-md overflow-hidden border border-border hover:border-blue-400 transition-colors"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/outlook/messages/${selectedMessage.id}/attachments?attachmentId=${encodeURIComponent(att.id)}`}
                                alt={att.name}
                                className="max-h-48 max-w-xs object-contain bg-muted/30"
                              />
                            </a>
                          ))}
                      </div>
                    )}

                    {/* Non-image attachment chips */}
                    {attachmentsData!.some(
                      (att) => !att.contentType.startsWith("image/")
                    ) && (
                      <div className="flex flex-wrap gap-2">
                        {attachmentsData!
                          .filter(
                            (att) => !att.contentType.startsWith("image/")
                          )
                          .map((att) => (
                            <a
                              key={att.id}
                              href={`/api/outlook/messages/${selectedMessage.id}/attachments?attachmentId=${encodeURIComponent(att.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.name}
                              className="flex items-center gap-2 bg-muted/60 hover:bg-muted border border-border rounded-md px-3 py-2 text-sm transition-colors group"
                            >
                              {att.contentType.includes("pdf") ||
                              att.contentType.includes("document") ||
                              att.contentType.includes("spreadsheet") ||
                              att.contentType.includes("text") ? (
                                <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              ) : (
                                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate max-w-40">
                                  {att.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {att.size < 1024
                                    ? `${att.size} B`
                                    : att.size < 1024 * 1024
                                      ? `${(att.size / 1024).toFixed(1)} KB`
                                      : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                                </span>
                              </div>
                              <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0" />
                            </a>
                          ))}
                      </div>
                    )}
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
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Conversation History ({threadMessages.length} message
                      {threadMessages.length !== 1 ? "s" : ""})
                    </h4>
                    <div className="space-y-2">
                      {threadMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`rounded-lg border p-3 text-sm ${
                            msg.sent
                              ? "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900 ml-6"
                              : "bg-muted/50 border-border mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {msg.from}
                              </span>
                              {msg.type === "email" ? (
                                <Mail className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              )}
                              {msg.subject && (
                                <span className="text-muted-foreground truncate max-w-48">
                                  {msg.subject}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-muted-foreground line-clamp-3">
                            {msg.preview}
                          </p>
                        </div>
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
                    <h4 className="text-sm text-muted-foreground">Reply</h4>
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
                    <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg border">
                      {pendingAttachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-1.5 bg-card border rounded-md px-2 py-1 text-xs text-foreground"
                        >
                          {file.type === "document" ? (
                            <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          ) : file.type === "image" ? (
                            <ImageIcon className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                          ) : file.url?.startsWith("http") && !file.path ? (
                            <Link2 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                          ) : (
                            <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="max-w-32 truncate">{file.name}</span>
                          <span className="text-muted-foreground">
                            {file.size}
                          </span>
                          <button
                            onClick={() =>
                              setPendingAttachments((prev) =>
                                prev.filter((f) => f.id !== file.id)
                              )
                            }
                            className="ml-0.5 hover:bg-accent rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {pendingSchedule && (
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md px-2 py-1 text-xs text-blue-700 dark:text-blue-300">
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
                  onSchedule={(draftText) => {
                    setReplyText(draftText);
                    setShowAIComposer(false);
                    setShowScheduleDialog(true);
                  }}
                  onSend={async (replyHtml: string) => {
                    setIsSending(true);
                    try {
                      await sendOutlookEmail({
                        to: selectedMessage.fromEmail || selectedMessage.from,
                        subject: `Re: ${selectedMessage.subject || ""}`,
                        bodyHtml: replyHtml,
                        threadId: selectedMessage.threadId,
                        replyToOutlookId: selectedMessage.outlookId,
                      });
                      toast.success("Reply sent successfully");
                      setShowAIComposer(false);
                      await refetch();
                    } catch (err) {
                      const error = err as Error;
                      toast.error(error.message || "Failed to send");
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
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a message to view</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose from {filteredMessages.length} loaded message
                {filteredMessages.length !== 1 ? "s" : ""} in your inbox
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
                  Sync Email
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
