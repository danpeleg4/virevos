import { useState } from "react";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Calendar } from "@/app/components/ui/calendar";
import type { PortalData } from "@/types/portal";
import { useAvailableSlots, useBookMeeting } from "../_lib/hooks";

type BookingStep = "calendar" | "form" | "confirmed";

interface ScheduleTabProps {
  data: PortalData;
  token: string;
}

export function ScheduleTab({ data, token }: ScheduleTabProps) {
  const allowedDurations = data.settings?.availability?.meetingDurations ?? [
    30,
  ];

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDuration, setSelectedDuration] = useState<number>(
    allowedDurations[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<BookingStep>("calendar");
  const [bookingForm, setBookingForm] = useState({
    clientName: data.client?.name || "",
    clientEmail: data.client?.email || "",
    notes: "",
  });

  const slotsQuery = useAvailableSlots(token, selectedDate, selectedDuration);
  const availableSlots = slotsQuery.data ?? [];

  const bookMeeting = useBookMeeting(token, () => setBookingStep("confirmed"));
  const isBooking = bookMeeting.isPending;

  const handleBookMeeting = () => {
    if (
      !selectedSlot ||
      !bookingForm.clientName.trim() ||
      !bookingForm.clientEmail.trim()
    )
      return;
    bookMeeting.mutate({
      clientName: bookingForm.clientName,
      clientEmail: bookingForm.clientEmail,
      dateTime: selectedSlot,
      duration: selectedDuration,
      notes: bookingForm.notes || undefined,
    });
  };

  const resetBooking = () => {
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setBookingStep("calendar");
    setBookingForm((prev) => ({ ...prev, notes: "" }));
  };

  return (
    <div className="mt-6">
      {bookingStep === "calendar" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl text-foreground">Schedule a Meeting</h2>
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
                            selectedDuration === d ? "default" : "outline"
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
                  ) : slotsQuery.isFetching ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Loading available times...
                      </p>
                    </div>
                  ) : slotsQuery.isError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Failed to load available times
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
                  {new Date(selectedSlot).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {new Date(selectedSlot).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
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
                  Your request for a <strong>{selectedDuration}-minute</strong>{" "}
                  meeting on{" "}
                  <strong>
                    {selectedSlot &&
                      new Date(selectedSlot).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                  </strong>{" "}
                  at{" "}
                  <strong>
                    {selectedSlot &&
                      new Date(selectedSlot).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
  );
}
