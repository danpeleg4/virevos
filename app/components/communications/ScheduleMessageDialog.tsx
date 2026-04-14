import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Calendar } from "../ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import {
  Clock,
  Calendar as CalendarIcon,
  Send,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { ScheduleDetails } from "@/types/communications";

interface ScheduleMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (schedule: ScheduleDetails) => void;
}

export function ScheduleMessageDialog({
  open,
  onOpenChange,
  onSchedule,
}: ScheduleMessageDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [recurring, setRecurring] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >("none");
  const [customMessage, setCustomMessage] = useState("");
  const [activeTab, setActiveTab] = useState("datetime");

  const handleSchedule = () => {
    if (date) {
      onSchedule({
        date,
        time,
        timezone,
        recurring: recurring !== "none" ? recurring : undefined,
      });
      onOpenChange(false);
    }
  };

  const quickScheduleOptions = [
    { label: "In 1 hour", value: "1h" },
    { label: "Tomorrow 9 AM", value: "tomorrow" },
    { label: "Next Monday", value: "monday" },
    { label: "End of week", value: "friday" },
  ];

  const getScheduleSummary = () => {
    if (!date) return null;

    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
              Message will be sent on:
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {dateStr} at {time} ({timezone})
            </p>
            {recurring !== "none" && (
              <Badge className="mt-2 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                Repeats {recurring}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Schedule Message
          </DialogTitle>
          <DialogDescription>
            Choose when to send this message automatically
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger className="cursor-pointer" value="datetime">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Date & Time
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="quick">
              <Clock className="h-4 w-4 mr-2" />
              Quick Schedule
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-4" style={{ height: "360px" }}>
            <TabsContent
              value="datetime"
              className="absolute inset-0 overflow-y-auto data-[state=inactive]:hidden"
            >
              <div className="grid grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <div className="border rounded-lg bg-card">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date()}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">
                          Eastern Time (ET)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CT)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MT)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PT)
                        </SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/London">
                          London (GMT)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Recurring</Label>
                    <Select
                      value={recurring}
                      onValueChange={(v) =>
                        setRecurring(
                          v as "none" | "daily" | "weekly" | "monthly"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Does not repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="quick"
              className="absolute inset-0 space-y-4 overflow-y-auto data-[state=inactive]:hidden"
            >
              <div className="grid grid-cols-2 gap-3">
                {quickScheduleOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => {
                      const now = new Date();
                      let newDate = new Date();

                      switch (option.value) {
                        case "1h":
                          newDate.setHours(now.getHours() + 1);
                          setTime(
                            `${String(newDate.getHours()).padStart(2, "0")}:${String(
                              newDate.getMinutes()
                            ).padStart(2, "0")}`
                          );
                          break;
                        case "tomorrow":
                          newDate.setDate(now.getDate() + 1);
                          setTime("09:00");
                          break;
                        case "monday":
                          const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
                          newDate.setDate(now.getDate() + daysUntilMonday);
                          setTime("09:00");
                          break;
                        case "friday":
                          const daysUntilFriday =
                            (5 - now.getDay() + 7) % 7 || 7;
                          newDate.setDate(now.getDate() + daysUntilFriday);
                          setTime("17:00");
                          break;
                      }

                      setDate(newDate);
                      setActiveTab("datetime");
                    }}
                  >
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-sm">{option.label}</span>
                  </Button>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Custom Reminder (Optional)</Label>
                <Textarea
                  placeholder="Add a note about this scheduled message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="space-y-4 pt-4 border-t">
          {getScheduleSummary()}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={!date}>
              <Send className="h-4 w-4 mr-2" />
              Schedule Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
