"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Globe,
  Palette,
  ExternalLink,
  Copy,
  Eye,
  Sparkles,
  Loader2,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  PortalRecord,
  PortalAvailability,
  PortalMeetingBooking,
} from "@/types/portal";
import type { ClientSummary } from "@/types/clients";
import {
  acceptBookingWithCalendar,
  updateBookingStatus,
} from "@/lib/portal_bookings";

interface ClientPortalProps {
  navContainer: HTMLDivElement | null;
}

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DURATION_OPTIONS = [15, 30, 45, 60];
const BUFFER_OPTIONS = [0, 5, 10, 15, 30];

function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const value = `${hh}:${mm}`;
      const period = h < 12 ? "AM" : "PM";
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      options.push({ value, label: `${displayH}:${mm} ${period}` });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

const DEFAULT_AVAILABILITY: PortalAvailability = {
  weeklySchedule: {
    monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  },
  meetingDurations: [15, 30, 45, 60],
  bufferMinutes: 15,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function ClientPortal({ navContainer }: ClientPortalProps) {
  const queryClient = useQueryClient();
  const [portals, setPortals] = useState<PortalRecord[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state for currently selected client
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [fileSharing, setFileSharing] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiChatBot, setAiChatBot] = useState(true);
  const [title, setTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Your Visa Readiness Dashboard. Monitor your deadlines and keep your documents audit-ready"
  );
  const [meetingSchedulingEnabled, setMeetingSchedulingEnabled] =
    useState(false);
  const [availability, setAvailability] =
    useState<PortalAvailability>(DEFAULT_AVAILABILITY);

  useEffect(() => {
    fetchPortals();
    fetchClients();
  }, []);

  const fetchPortals = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get("/api/portal/settings");
      setPortals(data.portals || []);
    } catch (err) {
      console.error("Failed to fetch portals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await axios.get("/api/clients");
      setClients(data.clients || data || []);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const portal = portals.find((p) => String(p.clientId) === clientId);
    if (portal) {
      setPortalEnabled(portal.enabled);
      setTitle(portal.settings?.title || "");
      setChatEnabled(portal.settings?.chatEnabled ?? true);
      setFileSharing(portal.settings?.fileSharing ?? true);
      setAiChatBot(portal.settings?.aiChatBot ?? true);
      setEmailNotifications(portal.settings?.emailNotifications ?? true);
      setMeetingSchedulingEnabled(
        portal.settings?.meetingSchedulingEnabled ?? false
      );
      setAvailability(portal.settings?.availability ?? DEFAULT_AVAILABILITY);
    } else {
      setPortalEnabled(true);
      setTitle("");
      setWelcomeMessage(
        "Your Visa Readiness Dashboard. Monitor your deadlines and keep your documents audit-ready"
      );
      setChatEnabled(true);
      setFileSharing(true);
      setAiChatBot(true);
      setEmailNotifications(true);
      setMeetingSchedulingEnabled(false);
      setAvailability(DEFAULT_AVAILABILITY);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client first");
      return;
    }

    setIsSaving(true);
    try {
      const res = await axios.post("/api/portal/settings", {
        clientId: parseInt(selectedClientId, 10),
        enabled: portalEnabled,
        settings: {
          title,
          welcomeMessage,
          chatEnabled,
          fileSharing,
          aiChatBot,
          emailNotifications,
          meetingSchedulingEnabled,
          availability,
        },
      });

      const data = res.data;
      setPortals((prev) => {
        const existing = prev.find(
          (p) => String(p.clientId) === selectedClientId
        );
        if (existing) {
          return prev.map((p) =>
            String(p.clientId) === selectedClientId ? { ...p, ...data } : p
          );
        }
        return [...prev, data];
      });
      queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
      toast.success("Portal settings saved");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Failed to save settings";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const { data: bookingsData } = useQuery({
    queryKey: ["portalBookings"],
    queryFn: async () => {
      const { data } = await axios.get<{
        bookings: (PortalMeetingBooking & {
          clientDisplayName: string | null;
        })[];
      }>("/api/portal/bookings");
      return data.bookings;
    },
    enabled: !!selectedClientId && meetingSchedulingEnabled,
  });

  const currentPortalId = portals.find(
    (p) => String(p.clientId) === selectedClientId
  )?.id;

  const portalBookings =
    bookingsData?.filter((b) => b.portalId === currentPortalId) ?? [];

  const confirmBooking = useMutation({
    mutationFn: (bookingId: number) => acceptBookingWithCalendar(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
      toast.success("Booking confirmed and added to calendar");
    },
    onError: () => toast.error("Failed to confirm booking"),
  });

  const cancelBooking = useMutation({
    mutationFn: (bookingId: number) =>
      updateBookingStatus(bookingId, "cancelled"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
      toast.success("Booking cancelled");
    },
    onError: () => toast.error("Failed to cancel booking"),
  });

  const updateDaySchedule = (
    day: string,
    field: "enabled" | "startTime" | "endTime",
    value: boolean | string
  ) => {
    setAvailability((prev) => ({
      ...prev,
      weeklySchedule: {
        ...prev.weeklySchedule,
        [day]: {
          ...prev.weeklySchedule[day],
          [field]: value,
        },
      },
    }));
  };

  const toggleDuration = (duration: number) => {
    setAvailability((prev) => {
      const current = prev.meetingDurations;
      const next = current.includes(duration)
        ? current.filter((d) => d !== duration)
        : [...current, duration].sort((a, b) => a - b);
      // Ensure at least one duration remains
      if (next.length === 0) return prev;
      return { ...prev, meetingDurations: next };
    });
  };

  const currentPortal = portals.find(
    (p) => String(p.clientId) === selectedClientId
  );
  const portalUrl = currentPortal?.portalUrl || "";

  const navActions = (
    <div className="flex items-center gap-2">
      {currentPortal && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(currentPortal.portalUrl, "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview Portal
        </Button>
      )}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={isSaving || !selectedClientId}
      >
        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Changes
      </Button>
    </div>
  );

  return (
    <>
      {navContainer && createPortal(navActions, navContainer)}
      <div className="overflow-y-auto h-full">
        {/* Client Selector */}
        <div>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-2 block">Select Client</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client to configure portal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                        {portals.find((p) => p.clientId === c.id) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Active
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </div>

        {/* Overview */}
        <div>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-blue-600" />
                  Client Portal
                </CardTitle>
                <CardDescription className="mt-2">
                  White-labeled portal for your clients to track projects,
                  communicate, and access files
                </CardDescription>
              </div>
              <Switch
                checked={portalEnabled}
                onCheckedChange={setPortalEnabled}
              />
            </div>
          </CardHeader>
          {selectedClientId && portalEnabled && (
            <CardContent className="space-y-4">
              {currentPortal ? (
                <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      <strong>Portal URL:</strong>
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(portalUrl);
                          toast.success("URL copied to clipboard");
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(portalUrl, "_blank")}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-mono break-all">
                    {portalUrl}
                  </p>
                  {currentPortal.lastAccessedAt && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Last accessed:{" "}
                      {new Date(currentPortal.lastAccessedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Save settings to generate a portal URL for this client
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </div>

        {selectedClientId && portalEnabled && (
          <>
            {/* Branding */}
            <div>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2 text-purple-600" />
                  Portal Branding
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your client portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 py-6">
                  <Label htmlFor="portal-title">Portal Title</Label>
                  <Input
                    id="portal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Acme Agency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed in the portal header
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="welcome">Welcome Message</Label>
                  <Textarea
                    id="welcome"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message appears when clients first access the portal
                  </p>
                </div>
              </CardContent>
            </div>

            <Separator />

            {/* Notification Settings */}
            <div>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 py-6">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when clients send messages
                    </p>
                  </div>
                  <Switch
                    disabled
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </CardContent>
            </div>

            <Separator />

            {/* Meeting Scheduling */}
            <div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <CalendarDays className="h-5 w-5 mr-2 text-emerald-600" />
                      Meeting Scheduling
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Allow clients to book meetings directly from their portal
                    </CardDescription>
                  </div>
                  <Switch
                    checked={meetingSchedulingEnabled}
                    onCheckedChange={setMeetingSchedulingEnabled}
                  />
                </div>
              </CardHeader>

              {meetingSchedulingEnabled && (
                <CardContent className="space-y-6">
                  {/* Weekly Availability */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Weekly Availability
                    </Label>
                    <div className="space-y-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const dayConfig = availability.weeklySchedule[day] ?? {
                          enabled: false,
                          startTime: "09:00",
                          endTime: "17:00",
                        };
                        return (
                          <div
                            key={day}
                            className="flex items-center gap-3 py-1"
                          >
                            <Switch
                              checked={dayConfig.enabled}
                              onCheckedChange={(val) =>
                                updateDaySchedule(day, "enabled", val)
                              }
                            />
                            <span className="w-24 text-sm text-foreground">
                              {DAY_LABELS[day]}
                            </span>
                            <Select
                              value={dayConfig.startTime}
                              onValueChange={(val) =>
                                updateDaySchedule(day, "startTime", val)
                              }
                              disabled={!dayConfig.enabled}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">
                              to
                            </span>
                            <Select
                              value={dayConfig.endTime}
                              onValueChange={(val) =>
                                updateDaySchedule(day, "endTime", val)
                              }
                              disabled={!dayConfig.enabled}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Meeting Durations */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Allowed Meeting Durations
                    </Label>
                    <div className="flex items-center gap-4 flex-wrap">
                      {DURATION_OPTIONS.map((d) => (
                        <div key={d} className="flex items-center gap-2">
                          <Checkbox
                            id={`duration-${d}`}
                            checked={availability.meetingDurations.includes(d)}
                            onCheckedChange={() => toggleDuration(d)}
                          />
                          <Label
                            htmlFor={`duration-${d}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {d} min
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Buffer Time */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Buffer Between Meetings
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Gap to block before and after each booking
                      </p>
                    </div>
                    <Select
                      value={String(availability.bufferMinutes)}
                      onValueChange={(val) =>
                        setAvailability((prev) => ({
                          ...prev,
                          bufferMinutes: parseInt(val, 10),
                        }))
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUFFER_OPTIONS.map((b) => (
                          <SelectItem key={b} value={String(b)}>
                            {b === 0 ? "None" : `${b} min`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Timezone */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Timezone</Label>
                      <p className="text-sm text-muted-foreground">
                        Availability is shown in this timezone
                      </p>
                    </div>
                    <p className="text-sm text-foreground">
                      {availability.timezone}
                    </p>
                  </div>

                  {/* Bookings Table */}
                  {currentPortal && portalBookings.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">
                          Meeting Requests
                        </Label>
                        <div className="space-y-2">
                          {portalBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <p className="text-sm font-medium">
                                    {booking.clientName}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={
                                      booking.status === "confirmed"
                                        ? "border-green-200 text-green-700 bg-green-50"
                                        : booking.status === "cancelled"
                                          ? "border-red-200 text-red-700 bg-red-50"
                                          : "border-yellow-200 text-yellow-700 bg-yellow-50"
                                    }
                                  >
                                    {booking.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(booking.dateTime).toLocaleString()}{" "}
                                  · {booking.duration} min
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {booking.clientEmail}
                                </p>
                              </div>
                              {booking.status === "pending" && (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                                    onClick={() =>
                                      confirmBooking.mutate(booking.id)
                                    }
                                    disabled={confirmBooking.isPending}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                      cancelBooking.mutate(booking.id)
                                    }
                                    disabled={cancelBooking.isPending}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
