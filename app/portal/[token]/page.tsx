"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Textarea } from "../../components/ui/textarea";
import { Calendar } from "../../components/ui/calendar";
import {
  CalendarDays,
  FileText,
  MessageSquare,
  Download,
  Send,
  Paperclip,
  Loader2,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowLeft,
  FolderKanban,
  Flag,
  Calendar as CalendarIcon,
  FileUp,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type { PortalData, PortalChatMessage, TimeSlot } from "@/types/portal";
import type { DocumentRequestItem } from "@/types/document_requests";
import { parseDateOnlyString } from "@/lib/date_utils";
import axios from "axios";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <CheckCircle className="h-3 w-3" />
          Completed
        </span>
      );
    case "in-progress":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
          <TrendingUp className="h-3 w-3" />
          In Progress
        </span>
      );
    case "on-hold":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
          <Clock className="h-3 w-3" />
          On Hold
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted text-muted-foreground border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
          {status}
        </span>
      );
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === "high"
      ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
      : priority === "medium"
        ? "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
        : "bg-muted text-muted-foreground border border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium ${styles}`}
    >
      <Flag className="h-2.5 w-2.5" />
      {priority}
    </span>
  );
}

type BookingStep = "calendar" | "form" | "confirmed";

export default function PortalPage() {
  const params = useParams();
  const token = params.token as string;

  const queryClient = useQueryClient();
  const [data, setData] = useState<PortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatQueryKey = ["portal-chat", token] as const;
  const { data: chatData } = useQuery<{ messages: PortalChatMessage[] }>({
    queryKey: chatQueryKey,
    queryFn: async () => {
      const res = await axios.get(`/api/portal/${token}/chat`);
      return res.data;
    },
    enabled: !!token,
    refetchInterval: 5000,
  });
  const localMessages: PortalChatMessage[] = chatData?.messages ?? [];

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      const res = await axios.post(`/api/portal/${token}/chat`, {
        message: body,
      });
      return res.data.message as PortalChatMessage;
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKey });
      const previous = queryClient.getQueryData<{
        messages: PortalChatMessage[];
      }>(chatQueryKey);
      const optimistic: PortalChatMessage = {
        id: -Date.now(),
        senderType: "client",
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<{ messages: PortalChatMessage[] }>(
        chatQueryKey,
        (old) => ({ messages: [...(old?.messages ?? []), optimistic] })
      );
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(chatQueryKey, ctx.previous);
      toast.error("Failed to send message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKey });
    },
  });

  // Scheduling state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<BookingStep>("calendar");
  const [bookingForm, setBookingForm] = useState({
    clientName: "",
    clientEmail: "",
    notes: "",
  });
  const [isBooking, setIsBooking] = useState(false);

  // File upload state
  const [localFiles, setLocalFiles] = useState<PortalData["files"]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  // Document checklist state
  const [documentRequests, setDocumentRequests] = useState<
    PortalData["documentRequests"]
  >([]);
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);

  useEffect(() => {
    if (token) fetchPortalData();
  }, [token]);

  useEffect(() => {
    if (selectedDate && selectedDuration) {
      fetchSlots(selectedDate, selectedDuration);
    }
  }, [selectedDate, selectedDuration]);

  const fetchPortalData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/portal/${token}`);
      const portalData = res.data;
      setData(portalData);
      setLocalFiles(portalData.files || []);
      setDocumentRequests(portalData.documentRequests || []);
      if (portalData.cases?.length > 0) {
        setSelectedCaseId(portalData.cases[0].id);
      }
      setBookingForm((prev) => ({
        ...prev,
        clientName: portalData.client?.name || "",
        clientEmail: portalData.client?.email || "",
      }));
      const durations = portalData.settings?.availability?.meetingDurations;
      if (durations?.length > 0) setSelectedDuration(durations[0]);
    } catch (err: unknown) {
      console.error("Failed to fetch portal data:", err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
      } else {
        setNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlots = async (date: Date, duration: number) => {
    setIsFetchingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);
    try {
      const dateStr = date.toISOString().split("T")[0];
      const res = await axios.get(`/api/portal/${token}/availability`, {
        params: { date: dateStr, duration },
      });
      setAvailableSlots(res.data.slots ?? []);
    } catch {
      toast.error("Failed to load available times");
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const handleSendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    setNewMessage("");
    sendMessage.mutate(trimmed);
  };

  // Auto-scroll the message thread when new messages arrive
  useEffect(() => {
    if (activeTab === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages.length, activeTab]);

  const handleBookMeeting = async () => {
    if (
      !selectedSlot ||
      !bookingForm.clientName.trim() ||
      !bookingForm.clientEmail.trim()
    )
      return;
    setIsBooking(true);
    try {
      const res = await axios.post(`/api/portal/${token}/book`, {
        clientName: bookingForm.clientName,
        clientEmail: bookingForm.clientEmail,
        dateTime: selectedSlot,
        duration: selectedDuration,
        notes: bookingForm.notes || undefined,
      });
      if (res.status === 200) {
        setBookingStep("confirmed");
      } else {
        toast.error("Failed to book meeting");
      }
    } catch {
      toast.error("Failed to book meeting");
    } finally {
      setIsBooking(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedCaseId) {
        formData.append("caseId", String(selectedCaseId));
      }
      const res = await axios.post(
        `/api/portal/${token}/files/upload`,
        formData
      );
      setLocalFiles((prev) => [res.data, ...prev]);
      toast.success("File uploaded successfully");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Upload failed";
      setUploadError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentItemUpload = async (itemId: number, file: File) => {
    setUploadingItemId(itemId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        `/api/portal/${token}/document-requests/${itemId}/upload`,
        formData
      );
      const uploadedFile = res.data.file;
      const status = res.data.status as DocumentRequestItem["status"];
      const analysis = res.data.analysis as {
        verdict: DocumentRequestItem["aiVerdict"];
        reasoning: string;
      } | null;
      const now = new Date().toISOString();
      setDocumentRequests((prev) =>
        prev.map((req) => ({
          ...req,
          items: req.items.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  status,
                  uploadedFileId: uploadedFile.id,
                  uploadedAt: now,
                  uploadedFile,
                  aiVerdict: analysis?.verdict ?? null,
                  aiReasoning: analysis?.reasoning ?? null,
                  aiAnalyzedAt: analysis ? now : null,
                }
              : it
          ),
        }))
      );
      if (analysis?.verdict === "does_not_meet") {
        toast.error(
          analysis.reasoning || `${file.name} does not meet the requirement`
        );
      } else if (analysis?.verdict === "meets") {
        toast.success(`${file.name} looks good`);
      } else {
        toast.success(`${file.name} uploaded`);
      }
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Upload failed";
      toast.error(message);
    } finally {
      setUploadingItemId(null);
    }
  };

  const pendingDocumentItemsCount = documentRequests.reduce(
    (acc, req) =>
      acc + req.items.filter((it) => it.status !== "uploaded").length,
    0
  );

  const resetBooking = () => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setBookingStep("calendar");
    setBookingForm((prev) => ({ ...prev, notes: "" }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">
            Loading your portal...
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Portal Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              This client portal is not available or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const portalTitle = data.settings?.title || "Client Portal";
  const unreadCount = localMessages.filter(
    (m) => m.senderType === "agency" && !m.readAt
  ).length;
  const isSending = sendMessage.isPending;
  const schedulingEnabled = !!data.settings?.meetingSchedulingEnabled;
  const allowedDurations = data.settings?.availability?.meetingDurations ?? [
    30,
  ];
  const upcomingBookings =
    data.bookings?.filter((b) => b.status !== "cancelled") ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-foreground">
                <span className="text-background text-xs font-bold">
                  {portalTitle.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {portalTitle}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-foreground">
                  {data.client.name}
                </p>
                {data.client.email && (
                  <p className="text-xs text-muted-foreground">
                    {data.client.email}
                  </p>
                )}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300">
                  {getInitials(data.client.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4 sm:p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl text-foreground">
            Welcome back, {data.client.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {data.settings?.welcomeMessage ||
              "Here's what's happening with your cases"}
          </p>
        </div>

        {/* Tabs */}
        <div>
          <div
            data-testid="portal-tab-bar"
            className="flex items-center gap-1 p-2 rounded-lg border border-border bg-muted/50 overflow-x-auto"
          >
            {(
              [
                { value: "overview", label: "Overview" },
                { value: "cases", label: "Cases", count: data.cases.length },
                {
                  value: "messages",
                  label: "Messages",
                  count: unreadCount,
                },
                { value: "files", label: "Files", count: localFiles.length },
                ...(documentRequests.length > 0
                  ? [
                      {
                        value: "documents",
                        label: "Documents Needed",
                        count: pendingDocumentItemsCount,
                      },
                    ]
                  : []),
                ...(schedulingEnabled
                  ? [{ value: "schedule", label: "Schedule Meeting" }]
                  : []),
              ] as { value: string; label: string; count?: number }[]
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`cursor-pointer text-xs px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.value
                    ? "bg-card border border-border text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.value
                        ? "bg-muted text-muted-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Cases table */}
                  <Card className="overflow-hidden p-0">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                      <FolderKanban className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-foreground">
                        Active Cases
                      </span>
                    </div>
                    <div>
                      {data.cases.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
                          <FolderKanban className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No cases yet
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="border-b border-border bg-muted/50">
                              <tr>
                                <th className="text-left px-4 py-2.5">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                    <FolderKanban className="h-3.5 w-3.5" />
                                    Case
                                  </div>
                                </th>
                                <th className="text-left px-4 py-2.5">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                    Status
                                  </div>
                                </th>
                                <th className="text-left px-4 py-2.5">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                    <Flag className="h-3.5 w-3.5" />
                                    Priority
                                  </div>
                                </th>
                                <th className="text-left px-4 py-2.5">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    Due
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {data.cases.slice(0, 5).map((aCase) => (
                                <tr
                                  key={aCase.id}
                                  className="hover:bg-muted/50 transition-colors"
                                >
                                  <td className="px-4 py-2.5">
                                    <p className="text-sm font-medium text-foreground">
                                      {aCase.name}
                                    </p>
                                    {aCase.description && (
                                      <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                                        {aCase.description}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <StatusBadge status={aCase.status} />
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <PriorityBadge priority={aCase.priority} />
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                    {aCase.dueDate
                                      ? parseDateOnlyString(
                                          aCase.dueDate
                                        ).toLocaleDateString()
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {data.cases.length > 5 && (
                        <div className="px-4 py-3 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setActiveTab("cases")}
                          >
                            View all {data.cases.length} cases
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Recent Messages */}
                  <Card className="overflow-hidden p-0">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-foreground">
                        Recent Messages
                      </span>
                    </div>
                    <div className="space-y-2 p-4">
                      {localMessages.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <MessageSquare className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No messages yet
                          </p>
                        </div>
                      ) : (
                        localMessages
                          .slice(-3)
                          .reverse()
                          .map((msg) => {
                            const isUnread =
                              msg.senderType === "agency" && !msg.readAt;
                            const senderLabel =
                              msg.senderType === "agency"
                                ? data.settings?.title || "Agency"
                                : data.client.name;
                            return (
                              <div
                                key={msg.id}
                                className={`p-3 rounded-lg border ${
                                  isUnread
                                    ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                                    : "bg-muted/50 border-border"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-medium text-foreground">
                                    {senderLabel}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      msg.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {msg.body}
                                </p>
                              </div>
                            );
                          })
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs mt-1"
                        onClick={() => setActiveTab("messages")}
                      >
                        View all messages
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <Card className="overflow-hidden p-0">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                      <span className="text-sm font-medium text-foreground">
                        Quick Actions
                      </span>
                    </div>
                    <div className="space-y-2 p-4">
                      {(data.settings?.chatEnabled ?? true) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setActiveTab("messages")}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Send Message
                        </Button>
                      )}
                      {(data.settings?.fileSharing ?? true) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setActiveTab("files")}
                        >
                          <Paperclip className="h-4 w-4" />
                          Files
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => setActiveTab("cases")}
                      >
                        <FolderKanban className="h-4 w-4" />
                        View Cases
                      </Button>
                      {schedulingEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setActiveTab("schedule")}
                        >
                          <CalendarDays className="h-4 w-4" />
                          Schedule Meeting
                        </Button>
                      )}
                    </div>
                  </Card>

                  {/* Upcoming Meetings */}
                  {schedulingEnabled && upcomingBookings.length > 0 && (
                    <Card className="overflow-hidden p-0">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                        <CalendarDays className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-foreground">
                          Upcoming Meetings
                        </span>
                      </div>
                      <div className="space-y-2 p-4">
                        {upcomingBookings.slice(0, 3).map((b) => (
                          <div
                            key={b.id}
                            className="p-3 rounded-lg bg-muted/50 border border-border"
                          >
                            <p className="text-xs font-medium text-foreground">
                              {new Date(b.dateTime).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(b.dateTime).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}{" "}
                              · {b.duration} min ·{" "}
                              <span className="capitalize">{b.status}</span>
                            </p>
                            {b.status === "confirmed" && b.meetingLink && (
                              <a
                                href={b.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Video className="h-3.5 w-3.5" />
                                Join meeting
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Cases ── */}
          {activeTab === "cases" && (
            <div className="mt-6">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                  <FolderKanban className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-foreground">
                    All Cases
                  </span>
                </div>
                <div>
                  {data.cases.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
                      <FolderKanban className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No cases yet
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-border bg-muted/50">
                          <tr>
                            <th className="text-left px-4 py-2.5">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <FolderKanban className="h-3.5 w-3.5" />
                                Case
                              </div>
                            </th>
                            <th className="text-left px-4 py-2.5">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                Status
                              </div>
                            </th>
                            <th className="text-left px-4 py-2.5">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <Flag className="h-3.5 w-3.5" />
                                Priority
                              </div>
                            </th>
                            <th className="text-left px-4 py-2.5">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                Due Date
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {data.cases.map((aCase) => (
                            <tr
                              key={aCase.id}
                              className="hover:bg-muted/50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-foreground">
                                  {aCase.name}
                                </p>
                                {aCase.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 max-w-sm truncate">
                                    {aCase.description}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={aCase.status} />
                              </td>
                              <td className="px-4 py-3">
                                <PriorityBadge priority={aCase.priority} />
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {aCase.dueDate ? (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    {parseDateOnlyString(
                                      aCase.dueDate
                                    ).toLocaleDateString()}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── Messages ── */}
          {activeTab === "messages" && (
            <div className="mt-6">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-foreground">
                    Messages
                  </span>
                </div>
                <div
                  className="flex flex-col"
                  style={{ height: "min(70vh, 600px)" }}
                  data-testid="portal-chat-thread"
                >
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {localMessages.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-12 text-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No messages yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Start the conversation below
                        </p>
                      </div>
                    ) : (
                      localMessages.map((msg) => {
                        const fromClient = msg.senderType === "client";
                        const senderLabel = fromClient
                          ? data.client.name
                          : data.settings?.title || "Agency";
                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-2 ${
                              fromClient ? "justify-end" : "justify-start"
                            }`}
                          >
                            {!fromClient && (
                              <Avatar className="h-7 w-7 mt-0.5">
                                <AvatarFallback className="text-xs bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                                  {senderLabel.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                                fromClient
                                  ? "bg-blue-600 text-white rounded-br-sm"
                                  : "bg-muted text-foreground rounded-bl-sm"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {msg.body}
                              </p>
                              <p
                                className={`text-[10px] mt-1 ${
                                  fromClient
                                    ? "text-blue-100"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  undefined,
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            </div>
                            {fromClient && (
                              <Avatar className="h-7 w-7 mt-0.5">
                                <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                                  {getInitials(data.client.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {(data.settings?.chatEnabled ?? true) && (
                    <div className="border-t border-border p-4">
                      <Textarea
                        placeholder="Write a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          onClick={handleSendMessage}
                          disabled={isSending || !newMessage.trim()}
                          className="gap-2"
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── Files ── */}
          {activeTab === "files" && (
            <div className="mt-6">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                  <Paperclip className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-foreground">
                    Files
                  </span>
                </div>
                <div className="space-y-4 p-4">
                  {/* Upload zone — only shown when fileSharing is not disabled */}
                  {(data.settings?.fileSharing ?? true) && (
                    <>
                      <input
                        type="file"
                        id="portalFileInput"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                          e.target.value = "";
                        }}
                      />

                      {/* Case selector when multiple cases exist */}
                      {data.cases.length > 1 && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">
                            Upload to:
                          </label>
                          <select
                            className="flex-1 text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            value={selectedCaseId ?? ""}
                            onChange={(e) =>
                              setSelectedCaseId(Number(e.target.value))
                            }
                          >
                            {data.cases.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        onClick={() =>
                          document.getElementById("portalFileInput")?.click()
                        }
                        className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                          isDraggingFile
                            ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20"
                            : "border-border hover:border-orange-300 hover:bg-muted/50"
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            <p className="text-sm text-muted-foreground">
                              Uploading...
                            </p>
                          </>
                        ) : (
                          <>
                            <FileUp className="h-8 w-8 text-muted-foreground" />
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">
                                Click to upload or drag & drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Max 10 MB per file
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1 pointer-events-none"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Browse Files
                            </Button>
                          </>
                        )}
                      </div>

                      {uploadError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {uploadError}
                        </p>
                      )}
                    </>
                  )}

                  {/* File list */}
                  {localFiles.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
                      <Paperclip className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No files yet
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                      {localFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex-shrink-0">
                              <FileText className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-foreground font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatFileSize(file.size)}
                                {file.createdAt
                                  ? ` · ${new Date(file.createdAt).toLocaleDateString()}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="shrink-0"
                          >
                            <a
                              href={`/api/portal/${token}/files/${file.id}/download`}
                              download={file.name}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── Documents Needed ── */}
          {activeTab === "documents" && (
            <div className="mt-6">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-foreground">
                    Documents Needed
                  </span>
                </div>
                <div className="p-4 space-y-6">
                  {documentRequests.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No documents requested
                      </p>
                    </div>
                  ) : (
                    documentRequests.map((req) => (
                      <div key={req.id} className="space-y-3">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            {req.eventTitle}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            From your meeting on{" "}
                            {new Date(req.eventDateTime).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                          {req.items.map((item) => {
                            const isUploading = uploadingItemId === item.id;
                            const inputId = `doc-item-input-${item.id}`;
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <div className="mt-0.5 shrink-0">
                                    {item.status === "uploaded" ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm text-foreground font-medium">
                                      {item.name}
                                    </p>
                                    {item.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {item.description}
                                      </p>
                                    )}
                                    {item.status === "uploaded" &&
                                      item.uploadedFile && (
                                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                          Uploaded:{" "}
                                          <a
                                            href={`/api/portal/${token}/files/${item.uploadedFile.id}/download`}
                                            className="underline"
                                            download={item.uploadedFile.name}
                                          >
                                            {item.uploadedFile.name}
                                          </a>
                                        </p>
                                      )}
                                    {item.status === "rejected" &&
                                      item.uploadedFile && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Last upload:{" "}
                                          <a
                                            href={`/api/portal/${token}/files/${item.uploadedFile.id}/download`}
                                            className="underline"
                                            download={item.uploadedFile.name}
                                          >
                                            {item.uploadedFile.name}
                                          </a>
                                        </p>
                                      )}
                                    {item.aiVerdict === "meets" && (
                                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                        ✓ Looks good
                                        {item.aiReasoning
                                          ? ` — ${item.aiReasoning}`
                                          : ""}
                                      </p>
                                    )}
                                    {item.aiVerdict === "does_not_meet" && (
                                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                        ✗ Does not meet requirements
                                        {item.aiReasoning
                                          ? ` — ${item.aiReasoning}`
                                          : ""}
                                        . Please re-upload.
                                      </p>
                                    )}
                                    {(item.aiVerdict === "needs_review" ||
                                      item.aiVerdict === "error" ||
                                      item.aiVerdict === "skipped") && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Awaiting agency review.
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {item.status !== "uploaded" && (
                                  <>
                                    <input
                                      type="file"
                                      id={inputId}
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleDocumentItemUpload(
                                            item.id,
                                            file
                                          );
                                        }
                                        e.target.value = "";
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="shrink-0 h-8 text-xs gap-1.5"
                                      onClick={() =>
                                        document
                                          .getElementById(inputId)
                                          ?.click()
                                      }
                                      disabled={isUploading}
                                    >
                                      {isUploading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Upload className="h-3.5 w-3.5" />
                                      )}
                                      Upload
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ── Schedule Meeting ── */}
          {schedulingEnabled && activeTab === "schedule" && (
            <div className="mt-6">
              {bookingStep === "calendar" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl text-foreground">
                      Schedule a Meeting
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pick a date and time that works for you
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Calendar + Duration */}
                    <div className="lg:col-span-1 space-y-4">
                      <Card className="overflow-hidden p-0">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                          <CalendarIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-foreground">
                            Select Date
                          </span>
                        </div>
                        <div className="space-y-4 p-4">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={{ before: new Date() }}
                          />
                          <div className="space-y-2 pt-2 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Duration
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {allowedDurations.map((d) => (
                                <Button
                                  key={d}
                                  size="sm"
                                  variant={
                                    selectedDuration === d
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => setSelectedDuration(d)}
                                  className="h-8 text-xs"
                                >
                                  {d} min
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Right: Time Slots */}
                    <div className="lg:col-span-2">
                      <Card className="overflow-hidden p-0">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-foreground">
                            {selectedDate
                              ? `Available Times — ${selectedDate.toLocaleDateString(
                                  undefined,
                                  {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}`
                              : "Available Times"}
                          </span>
                        </div>
                        <div className="p-4">
                          {!selectedDate ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
                              <p className="text-sm text-muted-foreground">
                                Choose a date to see available slots
                              </p>
                            </div>
                          ) : isFetchingSlots ? (
                            <div className="flex flex-col items-center justify-center py-16">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Loading available times...
                              </p>
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                              <p className="text-sm text-muted-foreground">
                                No available slots on this day
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Try another date
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                              {availableSlots.map((slot) => (
                                <Button
                                  key={slot.startTime}
                                  variant={slot.available ? "outline" : "ghost"}
                                  size="sm"
                                  disabled={!slot.available}
                                  onClick={() => {
                                    setSelectedSlot(slot.startTime);
                                    setBookingStep("form");
                                  }}
                                  className={`text-xs h-9 ${
                                    !slot.available
                                      ? "text-muted-foreground/40 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  {new Date(slot.startTime).toLocaleTimeString(
                                    undefined,
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === "form" && selectedSlot && (
                <div className="max-w-lg space-y-6">
                  <button
                    onClick={() => {
                      setBookingStep("calendar");
                      setSelectedSlot(null);
                    }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to calendar
                  </button>

                  <Card className="overflow-hidden p-0">
                    <div className="flex flex-col gap-3 px-4 py-3 border-b border-border bg-muted/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-foreground">
                          Confirm Your Meeting
                        </span>
                      </div>
                      <div className="p-3 bg-card rounded-lg border border-border">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(selectedSlot).toLocaleDateString(
                            undefined,
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {new Date(selectedSlot).toLocaleTimeString(
                            undefined,
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}{" "}
                          · {selectedDuration} minutes
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4 p-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="booking-name">Your Name</Label>
                        <Input
                          id="booking-name"
                          value={bookingForm.clientName}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              clientName: e.target.value,
                            }))
                          }
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="booking-email">Email Address</Label>
                        <Input
                          id="booking-email"
                          type="email"
                          value={bookingForm.clientEmail}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              clientEmail: e.target.value,
                            }))
                          }
                          placeholder="your@email.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="booking-notes">
                          Notes{" "}
                          <span className="text-muted-foreground font-normal text-xs">
                            (optional)
                          </span>
                        </Label>
                        <Textarea
                          id="booking-notes"
                          value={bookingForm.notes}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          placeholder="Anything you'd like to discuss..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={handleBookMeeting}
                        disabled={
                          isBooking ||
                          !bookingForm.clientName.trim() ||
                          !bookingForm.clientEmail.trim()
                        }
                      >
                        {isBooking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CalendarDays className="h-4 w-4" />
                        )}
                        Book Meeting
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {bookingStep === "confirmed" && (
                <div className="max-w-md mx-auto text-center">
                  <Card className="p-0">
                    <div className="py-14 space-y-5">
                      <div className="p-5 rounded-full bg-green-100 dark:bg-green-950/50 w-fit mx-auto">
                        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h2 className="text-xl text-foreground mb-2">
                          Meeting Request Submitted!
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Your request for a{" "}
                          <strong>{selectedDuration}-minute</strong> meeting on{" "}
                          <strong>
                            {selectedSlot &&
                              new Date(selectedSlot).toLocaleDateString(
                                undefined,
                                {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                          </strong>{" "}
                          at{" "}
                          <strong>
                            {selectedSlot &&
                              new Date(selectedSlot).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                          </strong>{" "}
                          has been received. We&apos;ll be in touch to confirm.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={resetBooking}
                        className="gap-2"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Book Another Meeting
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
