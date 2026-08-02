"use client";

import { Dispatch, SetStateAction } from "react";
import axios from "axios";
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
  Copy,
  Eye,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  PortalRecord,
  PortalAvailability,
  PortalMeetingBooking,
} from "@/types/portal";
import { timeOptions } from "@/lib/util/utils";
import { toast } from "@/app/components/ui/toast-store";
interface ClientPortalSettingsProps {
  clientId: number;
  portalEnabled: boolean;
  onPortalEnabledChange: (enabled: boolean) => void;
  title: string;
  onTitleChange: (title: string) => void;
  welcomeMessage: string;
  onWelcomeMessage: (welcomeMessage: string) => void;
  emailNotifications: boolean;
  meetingSchedulingEnabled: boolean;
  onMeetingSchedulingEnabledChange: (enabled: boolean) => void;
  availability: PortalAvailability;
  onAvailability: Dispatch<SetStateAction<PortalAvailability>>;
  isProvisioningPortal: boolean;
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

export function ClientPortalSettings({
  clientId,
  portalEnabled,
  onPortalEnabledChange,
  title,
  onTitleChange,
  welcomeMessage,
  onWelcomeMessage,
  emailNotifications,
  meetingSchedulingEnabled,
  onMeetingSchedulingEnabledChange,
  availability,
  onAvailability,
  isProvisioningPortal,
}: ClientPortalSettingsProps) {
  const queryClient = useQueryClient();

  const portalQuery = useQuery({
    queryKey: ["clientPortal", clientId],
    queryFn: async () => {
      const { data } = await axios.get<{ portal: PortalRecord | null }>(
        `/api/clients/${clientId}?type=portal`
      );
      return data.portal;
    },
  });

  const bookingsQuery = useQuery({
    queryKey: ["portalBookings"],
    queryFn: async () => {
      const { data } = await axios.get<{
        bookings: (PortalMeetingBooking & {
          clientDisplayName: string | null;
        })[];
      }>("/api/portal", {
        params: { type: "bookings" },
      });
      return data.bookings;
    },
    enabled: meetingSchedulingEnabled && !!portalQuery.data?.id,
  });

  const currentPortalId = portalQuery.data?.id;
  const portalBookings =
    bookingsQuery.data?.filter((b) => b.portalId === currentPortalId) ?? [];

  const confirmBooking = useMutation({
    mutationFn: async (bookingId: number) => {
      await axios.patch(`/api/portal-bookings/${bookingId}`, {
        type: "accept",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
    },
    onSettled: async () => {
      toast.success({
        title: "Confirmed",
        description: "Booking confirmed successfully",
      });
    },
    onError: async () => {
      toast.error({
        title: "Failed",
        description: "Booking confirmed failed",
      });
    },
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: number) => {
      await axios.patch(`/api/portal-bookings/${bookingId}`, {
        type: "status",
        data: { status: "cancelled" },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
    },
    onSettled: async () => {
      toast.success({
        title: "Cancelled",
        description: "Booking cancelled successfully",
      });
    },
    onError: async () => {
      toast.error({
        title: "Failed",
        description: "Booking cancelled failed",
      });
    },
  });

  const updateDaySchedule = (
    day: string,
    field: "enabled" | "startTime" | "endTime",
    value: boolean | string
  ) => {
    onAvailability((prev) => ({
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
    onAvailability((prev) => {
      const current = prev.meetingDurations;
      const next = current.includes(duration)
        ? current.filter((d) => d !== duration)
        : [...current, duration].sort((a, b) => a - b);
      if (next.length === 0) return prev;
      return { ...prev, meetingDurations: next };
    });
  };

  const portalUrl = portalQuery.data?.portalUrl || "";
  const currentPortal = portalQuery.data;

  return (
    <div
      className="overflow-y-auto h-full"
      data-testid="client-portal-settings"
    >
      {/* Overview */}
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              Client Portal
            </CardTitle>
            <CardDescription className="mt-2">
              White-labeled portal for your client to track projects,
              communicate, and access files
            </CardDescription>
          </div>
          <Switch
            checked={portalEnabled}
            onCheckedChange={onPortalEnabledChange}
            aria-label="Portal enabled"
          />
        </div>
      </CardHeader>
      {portalEnabled && (
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
                      void navigator.clipboard
                        .writeText(portalUrl)
                        .catch(() => {});
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
              {isProvisioningPortal ? (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating portal URL...
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Save settings to generate a portal URL for this client
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}

      {portalEnabled && (
        <>
          {/* Branding */}
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="h-5 w-5 mr-2 text-purple-600" />
              Portal Branding
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the client portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 py-6">
              <Label htmlFor="portal-title">Portal Title</Label>
              <Input
                id="portal-title"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. Acme Agency"
              />
              <p className="text-xs text-muted-foreground">
                Displayed in the portal header
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <CardTitle className="flex items-center mb-3">
                <MessageSquare className="h-5 w-5 mr-2 text-orange-600" />
                Welcome Message
              </CardTitle>
              <Textarea
                id="welcome"
                placeholder={"Welcome to our portal!"}
                value={welcomeMessage}
                onChange={(e) => onWelcomeMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mb-4">
                This message appears when the client first accesses the portal
              </p>
            </div>
          </CardContent>

          <Separator />

          {/* Notification Settings */}
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1 py-6">
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-blue-600" />
                  Email Notifications
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Get notified when the client sends messages
                </p>
              </div>
              <Switch
                disabled
                checked={emailNotifications}
                aria-label="Email notifications"
              />
            </div>
          </CardContent>

          <Separator />

          {/* Meeting Scheduling */}
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2 text-emerald-600" />
                  Meeting Scheduling
                </CardTitle>
                <CardDescription className="mt-2">
                  Allow the client to book meetings directly from their portal
                </CardDescription>
              </div>
              <Switch
                checked={meetingSchedulingEnabled}
                onCheckedChange={onMeetingSchedulingEnabledChange}
                aria-label="Meeting scheduling enabled"
              />
            </div>
          </CardHeader>

          {meetingSchedulingEnabled && (
            <CardContent className="space-y-6">
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
                      <div key={day} className="flex items-center gap-3 py-1">
                        <Switch
                          checked={dayConfig.enabled}
                          onCheckedChange={(val) =>
                            updateDaySchedule(day, "enabled", val)
                          }
                        />
                        <span className="w-24 text-sm text-foreground">
                          {DAY_LABELS[day]}
                        </span>
                        <div>
                          <Label className="sr-only">
                            Start time for {DAY_LABELS[day]}
                          </Label>
                          <Select
                            value={dayConfig.startTime}
                            onValueChange={(val) =>
                              updateDaySchedule(day, "startTime", val)
                            }
                            disabled={!dayConfig.enabled}
                          >
                            <SelectTrigger
                              className="mt-2"
                              aria-label={`Start time for ${DAY_LABELS[day]}`}
                            >
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {timeOptions.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          to
                        </span>
                        <div>
                          <Label className="sr-only">
                            End time for {DAY_LABELS[day]}
                          </Label>
                          <Select
                            value={dayConfig.endTime}
                            onValueChange={(val) =>
                              updateDaySchedule(day, "endTime", val)
                            }
                            disabled={!dayConfig.enabled}
                          >
                            <SelectTrigger
                              className="mt-2"
                              aria-label={`End time for ${DAY_LABELS[day]}`}
                            >
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent className="">
                              {timeOptions.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

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
                    onAvailability((prev) => ({
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
                              {new Date(booking.dateTime).toLocaleString()} ·{" "}
                              {booking.duration} min
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
                                onClick={() => cancelBooking.mutate(booking.id)}
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
        </>
      )}
    </div>
  );
}
