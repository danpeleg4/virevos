"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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
import {
  acceptBookingWithCalendar,
  updateBookingStatus,
} from "@/lib/portal_bookings";
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

          {/* Meeting Requests */}
          {pendingBookings.length > 0 && (
            <div className="border-b border-border bg-card">
              <div className="px-4 py-2.5 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900">
                <Bell className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                  {pendingBookings.length} Meeting Request
                  {pendingBookings.length > 1 ? "s" : ""}
                </span>
              </div>
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
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md h-8 px-2.5 text-xs font-medium text-white transition-colors disabled:pointer-events-none disabled:opacity-50"
                          style={{ backgroundColor: "#059669" }}
                          onClick={() => acceptMutation.mutate(booking.id)}
                          disabled={isAccepting || isDenying}
                          onMouseEnter={(e) => {
                            if (!isAccepting && !isDenying)
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.backgroundColor = "#047857";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.backgroundColor = "#059669";
                          }}
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
