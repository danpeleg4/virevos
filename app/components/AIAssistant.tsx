"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import ReactMarkdown from "react-markdown";
import {
  X,
  Send,
  Sparkles,
  Loader2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Bell,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { clients } from "@/types/clients";
import type {
  AIMessage,
  AddClientToolResult,
  StreamEvent,
  CreateCaseToolResult,
  UpdateClientToolResult,
  UpdateCaseToolResult,
  CreateTaskToolResult,
  UpdateTaskToolResult,
  CreateEventToolResult,
  UpdateEventToolResult,
} from "@/types/ai";
import type { PortalMeetingBooking } from "@/types/portal";
import type {
  PendingDocRequest,
  DocumentRequestItemInput,
} from "@/types/document_requests";
import {
  acceptBookingWithCalendar,
  updateBookingStatus,
} from "@/lib/portal_bookings";
import {
  approveDocumentRequest,
  declineDocumentRequest,
  updateDocumentRequest,
} from "@/lib/document_requests";
import { toast } from "sonner";

type BookingWithClient = PortalMeetingBooking & {
  clientDisplayName: string | null;
};

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  pendingBookings: BookingWithClient[];
}

export function AIAssistant({
  isOpen,
  onClose,
  pendingBookings,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const [input, setInput] = useState("");
  const [meetingsExpanded, setMeetingsExpanded] = useState(false);
  const [docRequestsExpanded, setDocRequestsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const previousResponseIdRef = useRef<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const acceptMutation = useMutation({
    mutationFn: (bookingId: number) => acceptBookingWithCalendar(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
      toast.success("Meeting confirmed and added to calendar");
    },
    onError: () => toast.error("Failed to confirm meeting"),
  });

  const denyMutation = useMutation({
    mutationFn: (bookingId: number) =>
      updateBookingStatus(bookingId, "cancelled"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
      toast.success("Meeting request declined");
    },
    onError: () => toast.error("Failed to decline meeting"),
  });

  const pendingDocRequestsQuery = useQuery({
    queryKey: ["documentRequests", "pending"],
    queryFn: async () => {
      const res = await axios.get<PendingDocRequest[]>(
        "/api/document-requests/pending"
      );
      return res.data;
    },
    enabled: isOpen,
  });
  const pendingDocRequests = pendingDocRequestsQuery.data ?? [];

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await axios.get<clients[]>("/api/clients");
      return res.data;
    },
    enabled: isOpen && pendingDocRequests.length > 0,
  });
  const clientsList = clientsQuery.data ?? [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || status === "streaming") return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantId = `assistant-${Date.now() + 1}`;

    const updatedMessages = [...messages, userMessage];
    setMessages([
      ...updatedMessages,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStatus("streaming");

    abortRef.current = new AbortController();

    try {
      let lastProcessedLength = 0;
      let buffer = "";

      await axios.post(
        "/api/chat",
        {
          messages: [{ role: userMessage.role, content: userMessage.content }],
          ...(previousResponseIdRef.current && {
            previousResponseId: previousResponseIdRef.current,
          }),
        },
        {
          signal: abortRef.current.signal,
          responseType: "text",
          onDownloadProgress: (progressEvent) => {
            const text = (progressEvent.event.target as XMLHttpRequest)
              .responseText;
            const newText = text.slice(lastProcessedLength);
            lastProcessedLength = text.length;

            buffer += newText;
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const event: StreamEvent = JSON.parse(line);
                if (event.type === "text_delta") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + event.delta }
                        : m
                    )
                  );
                } else if (
                  event.type === "tool_result" &&
                  event.name === "addClient"
                ) {
                  const data = event.result as AddClientToolResult;
                  if (data.kind === "clients_updated") {
                    const newClient = data.client;
                    queryClient.setQueryData<clients[]>(
                      ["clients"],
                      (old = []) => [
                        ...old,
                        {
                          ...newClient,
                          status: "active",
                          totalCases: 0,
                          activeCases: 0,
                          completedCases: 0,
                          avatar: newClient.name[0],
                        },
                      ]
                    );
                  }
                } else if (
                  event.type === "tool_result" &&
                  event.name === "createCase"
                ) {
                  const data = event.result as CreateCaseToolResult;
                  if (data.kind === "case_created") {
                    queryClient.invalidateQueries({ queryKey: ["cases"] });
                  }
                } else if (
                  event.type === "tool_result" &&
                  event.name === "updateClient"
                ) {
                  const data = event.result as UpdateClientToolResult;
                  if (data.kind === "client_updated") {
                    queryClient.invalidateQueries({ queryKey: ["clients"] });
                  }
                } else if (
                  event.type === "tool_result" &&
                  event.name === "updateCase"
                ) {
                  const data = event.result as UpdateCaseToolResult;
                  if (data.kind === "case_updated") {
                    queryClient.invalidateQueries({ queryKey: ["cases"] });
                  }
                } else if (
                  event.type === "tool_result" &&
                  event.name === "createTask"
                ) {
                  const data = event.result as CreateTaskToolResult;
                  if (data.kind === "task_created") {
                    queryClient.invalidateQueries({ queryKey: ["tasks"] });
                  }
                } else if (
                  event.type === "tool_result" &&
                  event.name === "updateTask"
                ) {
                  const data = event.result as UpdateTaskToolResult;
                  if (data.kind === "task_updated") {
                    queryClient.invalidateQueries({ queryKey: ["tasks"] });
                  }
                } else if (
                  event.type === "tool_result" &&
                  event.name === "createEvent"
                ) {
                  const data = event.result as CreateEventToolResult;
                  if (data.kind === "event_created") {
                    queryClient.invalidateQueries({ queryKey: ["events"] });
                  }
                } else if (
                  event.type === "tool_result" &&
                  event.name === "updateEvent"
                ) {
                  const data = event.result as UpdateEventToolResult;
                  if (data.kind === "event_updated") {
                    queryClient.invalidateQueries({ queryKey: ["events"] });
                  }
                } else if (event.type === "done") {
                  if (event.response_id) {
                    previousResponseIdRef.current = event.response_id;
                  }
                } else if (event.type === "error") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content:
                              "Sorry, something went wrong. Please try again.",
                          }
                        : m
                    )
                  );
                }
              } catch {
                // ignore parse errors for malformed lines
              }
            }
          },
        }
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.code === "ERR_CANCELED") {
        // aborted — no error message needed
      } else if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                }
              : m
          )
        );
      }
    } finally {
      setStatus("idle");
      abortRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  return (
    <div>
      {isOpen && (
        <motion.div
          key="ai-assistant-panel"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 h-screen bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden"
          style={{ width: "420px" }}
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-2 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-foreground">Virevos AI</h3>
                <p className="text-xs text-muted-foreground">
                  Powered by Virevos Brain
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Next Best Actions
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-sm text-gray-700 mb-3">Next Best Actions</h4>
            <div className="space-y-2">
              {nextBestActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-3 transition-colors cursor-pointer bg-white border-gray-200 hover:bg-gray-100">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          action.priority === "high"
                            ? "bg-red-50"
                            : action.priority === "medium"
                              ? "bg-yellow-50"
                              : "bg-green-50"
                        }`}
                      >
                        <action.icon
                          className={`h-4 w-4 ${
                            action.priority === "high"
                              ? "text-red-600"
                              : action.priority === "medium"
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-900">
                            {action.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs border ${
                              action.priority === "high"
                                ? "border-red-200 text-red-700"
                                : action.priority === "medium"
                                  ? "border-yellow-200 text-yellow-700"
                                  : "border-green-200 text-green-700"
                            }`}
                          >
                            {action.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
          */}

          {/* Document Requests */}
          {pendingDocRequests.length > 0 && (
            <div className="border-b border-border bg-card">
              <button
                type="button"
                onClick={() => {
                  if (pendingDocRequests.length > 2) {
                    setDocRequestsExpanded((v) => !v);
                  }
                }}
                disabled={pendingDocRequests.length <= 2}
                className={`w-full px-4 py-2.5 flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 ${
                  pendingDocRequests.length <= 2 || docRequestsExpanded
                    ? "border-b border-blue-100 dark:border-blue-900"
                    : ""
                } ${
                  pendingDocRequests.length > 2
                    ? "cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                    : "cursor-default"
                }`}
                aria-expanded={
                  pendingDocRequests.length > 2 ? docRequestsExpanded : undefined
                }
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex-1 text-left">
                  {pendingDocRequests.length} Document Request
                  {pendingDocRequests.length > 1 ? "s" : ""}
                </span>
                {pendingDocRequests.length > 2 &&
                  (docRequestsExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                  ))}
              </button>
              {(pendingDocRequests.length <= 2 || docRequestsExpanded) && (
                <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
                  {pendingDocRequests.map((req) => (
                    <DocRequestCard
                      key={req.id}
                      request={req}
                      clients={clientsList}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Meeting Requests */}
          {pendingBookings.length > 0 && (
            <div className="border-b border-border bg-card">
              <button
                type="button"
                onClick={() => {
                  if (pendingBookings.length > 2) {
                    setMeetingsExpanded((v) => !v);
                  }
                }}
                disabled={pendingBookings.length <= 2}
                className={`w-full px-4 py-2.5 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 ${
                  pendingBookings.length <= 2 || meetingsExpanded
                    ? "border-b border-red-100 dark:border-red-900"
                    : ""
                } ${
                  pendingBookings.length > 2
                    ? "cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                    : "cursor-default"
                }`}
                aria-expanded={
                  pendingBookings.length > 2 ? meetingsExpanded : undefined
                }
              >
                <Bell className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-400 flex-1 text-left">
                  {pendingBookings.length} Meeting Request
                  {pendingBookings.length > 1 ? "s" : ""}
                </span>
                {pendingBookings.length > 2 &&
                  (meetingsExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-red-500" />
                  ))}
              </button>
              {(pendingBookings.length <= 2 || meetingsExpanded) && (
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {pendingBookings.map((booking) => {
                  const dt = new Date(booking.dateTime);
                  const isAccepting =
                    acceptMutation.isPending &&
                    acceptMutation.variables === booking.id;
                  const isDenying =
                    denyMutation.isPending &&
                    denyMutation.variables === booking.id;
                  return (
                    <div key={booking.id} className="p-4 space-y-3">
                      {/* Booking summary */}
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 shrink-0">
                          <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            <p className="text-sm font-medium text-foreground truncate">
                              {booking.clientDisplayName || booking.clientName}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {booking.clientEmail}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-foreground">
                              <CalendarDays className="h-3 w-3 text-muted-foreground" />
                              {dt.toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-foreground">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {dt.toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {" · "}
                              {booking.duration} min
                            </div>
                          </div>
                          {booking.notes && (
                            <p className="mt-1.5 text-xs text-muted-foreground italic line-clamp-2">
                              &ldquo;{booking.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="inline-flex flex-1 items-center bg-green-600 hover:bg-green-700 cursor-pointer justify-center gap-1.5 rounded-md h-8 px-2.5 text-xs font-medium text-white transition-colors disabled:pointer-events-none disabled:opacity-50 "
                          onClick={() => acceptMutation.mutate(booking.id)}
                          disabled={isAccepting || isDenying}
                        >
                          {isAccepting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          )}
                          Accept
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
                          onClick={() => denyMutation.mutate(booking.id)}
                          disabled={isAccepting || isDenying}
                        >
                          {isDenying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-muted/50">
            {messages.map((message, msgIndex) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: msgIndex * 0.05 }}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`${message.role === "assistant" ? "w-full min-w-0" : ""}`}
                >
                  {message.role === "user" ? (
                    <div className="bg-blue-600 text-white rounded-2xl px-4 py-2.5">
                      <p>{message.content}</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg px-4 py-3 overflow-hidden min-w-0">
                      <div className="text-sm text-foreground break-words overflow-hidden">
                        {message.content ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-muted/50">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Plan, search, build anything..."
                className="flex-1"
                disabled={status === "streaming"}
              />
              <Button
                onClick={handleSend}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!input.trim() || status === "streaming"}
              >
                {status === "streaming" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface DraftItem extends DocumentRequestItemInput {
  localKey: string;
}

function DocRequestCard({
  request,
  clients: clientsList,
}: {
  request: PendingDocRequest;
  clients: clients[];
}) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState<number | null>(request.clientId);
  const [draftItems, setDraftItems] = useState<DraftItem[]>(() =>
    request.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      sortOrder: it.sortOrder,
      localKey: `existing-${it.id}`,
    }))
  );
  const [dirty, setDirty] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (patch: {
      clientId?: number | null;
      items?: DocumentRequestItemInput[];
    }) => {
      await updateDocumentRequest(request.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documentRequests", "pending"],
      });
      setDirty(false);
      toast.success("Saved");
    },
    onError: () => toast.error("Failed to save changes"),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await approveDocumentRequest(request.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documentRequests", "pending"],
      });
      toast.success("Document request sent to client");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to approve request"),
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      await declineDocumentRequest(request.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documentRequests", "pending"],
      });
      toast.success("Document request declined");
    },
    onError: () => toast.error("Failed to decline request"),
  });

  const handleClientChange = (value: string) => {
    const next = value === "__none__" ? null : parseInt(value, 10);
    setClientId(next);
    updateMutation.mutate({ clientId: next });
  };

  const handleAddItem = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        name: "",
        description: null,
        sortOrder: prev.length,
        localKey: `new-${Date.now()}-${prev.length}`,
      },
    ]);
    setDirty(true);
  };

  const handleItemChange = (
    localKey: string,
    field: "name" | "description",
    value: string
  ) => {
    setDraftItems((prev) =>
      prev.map((it) =>
        it.localKey === localKey ? { ...it, [field]: value } : it
      )
    );
    setDirty(true);
  };

  const handleRemoveItem = (localKey: string) => {
    setDraftItems((prev) => prev.filter((it) => it.localKey !== localKey));
    setDirty(true);
  };

  const handleSaveItems = () => {
    const cleaned = draftItems
      .filter((it) => it.name.trim().length > 0)
      .map((it, idx) => ({
        id: it.id,
        name: it.name.trim(),
        description: it.description?.toString().trim() || null,
        sortOrder: idx,
      }));
    updateMutation.mutate({ items: cleaned });
  };

  const eventDate = new Date(request.eventDateTime);
  const canApprove =
    !!clientId &&
    !dirty &&
    !updateMutation.isPending &&
    !approveMutation.isPending &&
    draftItems.some((it) => it.name.trim().length > 0);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 shrink-0">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {request.eventTitle}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {eventDate.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Client
        </label>
        <Select
          value={clientId == null ? "__none__" : String(clientId)}
          onValueChange={handleClientChange}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select client —</SelectItem>
            {clientsList.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Documents to request ({draftItems.length})
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
        {draftItems.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No documents listed.
          </p>
        )}
        {draftItems.map((it) => (
          <div key={it.localKey} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <Input
                value={it.name}
                onChange={(e) =>
                  handleItemChange(it.localKey, "name", e.target.value)
                }
                placeholder="Document name (e.g. Passport)"
                className="h-8 text-xs"
              />
              <Input
                value={it.description ?? ""}
                onChange={(e) =>
                  handleItemChange(it.localKey, "description", e.target.value)
                }
                placeholder="Optional note"
                className="h-7 text-[11px]"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveItem(it.localKey)}
              className="p-1.5 mt-0.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {dirty && (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={handleSaveItems}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Save edits
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex flex-1 items-center bg-green-600 hover:bg-green-700 cursor-pointer justify-center gap-1.5 rounded-md h-8 px-2.5 text-xs font-medium text-white transition-colors disabled:pointer-events-none disabled:opacity-50"
          onClick={() => approveMutation.mutate()}
          disabled={!canApprove || declineMutation.isPending}
          title={
            !clientId
              ? "Select a client first"
              : dirty
                ? "Save your edits first"
                : undefined
          }
        >
          {approveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          )}
          Approve & send
        </button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
          onClick={() => declineMutation.mutate()}
          disabled={
            approveMutation.isPending ||
            declineMutation.isPending ||
            updateMutation.isPending
          }
        >
          {declineMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Decline
        </Button>
      </div>
    </div>
  );
}
