"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Textarea } from "../../components/ui/textarea";
import { Calendar } from "../../components/ui/calendar";
import { Badge } from "../../components/ui/badge";
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
import type { PortalData, TimeSlot } from "@/types/portal";
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

  const [data, setData] = useState<PortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<PortalData["messages"]>(
    []
  );

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
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(
    null
  );

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
      setLocalMessages(portalData.messages || []);
      setLocalFiles(portalData.files || []);
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      await axios.post(`/api/portal/${token}/message`, { message: newMessage });
      setLocalMessages((prev) => [
        {
          id: Date.now(),
          subject: null,
          preview: newMessage,
          from: data?.client.name || "You",
          isSent: false,
          sentAt: new Date().toISOString(),
          isRead: true,
        },
        ...prev,
      ]);
      setNewMessage("");
      toast.success("Message sent successfully");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

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
  const unreadCount = localMessages.filter((m) => !m.isRead).length;
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="min-w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="cases">Cases</TabsTrigger>
              <TabsTrigger value="messages">
                Messages
                {unreadCount > 0 && (
                  <Badge className="ml-2 h-4 px-1.5 text-[10px] bg-blue-500 text-white border-0">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              {schedulingEnabled && (
                <TabsTrigger value="schedule">Schedule Meeting</TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cases table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <FolderKanban className="h-4 w-4 mr-2 text-blue-600" />
                      Active Cases
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
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
                          <thead className="border-b border-border">
                            <tr>
                              <th className="text-left px-4 py-2.5">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Case
                                </span>
                              </th>
                              <th className="text-left px-4 py-2.5">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Status
                                </span>
                              </th>
                              <th className="text-left px-4 py-2.5">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Priority
                                </span>
                              </th>
                              <th className="text-left px-4 py-2.5">
                                <span className="text-xs text-muted-foreground font-medium">
                                  Due
                                </span>
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
                  </CardContent>
                </Card>

                {/* Recent Messages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
                      Recent Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {localMessages.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No messages yet
                        </p>
                      </div>
                    ) : (
                      localMessages.slice(0, 3).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg border ${
                            !msg.isRead
                              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                              : "bg-muted/50 border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-foreground">
                              {msg.from}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.sentAt).toLocaleDateString()}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-xs font-medium text-foreground mb-0.5">
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {msg.preview}
                          </p>
                        </div>
                      ))
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs mt-1"
                      onClick={() => setActiveTab("messages")}
                    >
                      View all messages
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                  </CardContent>
                </Card>

                {/* Upcoming Meetings */}
                {schedulingEnabled && upcomingBookings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-green-600" />
                        Upcoming Meetings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
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
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Cases ── */}
          <TabsContent value="cases" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <FolderKanban className="h-4 w-4 mr-2 text-blue-600" />
                  All Cases
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Messages ── */}
          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-[480px] overflow-y-auto">
                  {localMessages.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No messages yet
                      </p>
                    </div>
                  ) : (
                    localMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border ${
                          !msg.isRead
                            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                            : "bg-muted/50 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                                {msg.from.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-medium text-foreground">
                              {msg.from}
                            </p>
                            {!msg.isRead && (
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.sentAt).toLocaleString()}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className="text-xs font-medium text-foreground ml-9 mb-1">
                            {msg.subject}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground ml-9">
                          {msg.preview}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {(data.settings?.chatEnabled ?? true) && (
                  <div className="border-t border-border pt-4">
                    <Textarea
                      placeholder="Write a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Files ── */}
          <TabsContent value="files" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <Paperclip className="h-4 w-4 mr-2 text-orange-600" />
                  Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Schedule Meeting ── */}
          {schedulingEnabled && (
            <TabsContent value="schedule" className="mt-6">
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
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Select Date</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right: Time Slots */}
                    <div className="lg:col-span-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
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
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Confirm Your Meeting
                      </CardTitle>
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
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
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>
                </div>
              )}

              {bookingStep === "confirmed" && (
                <div className="max-w-md mx-auto text-center">
                  <Card>
                    <CardContent className="py-14 space-y-5">
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
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
