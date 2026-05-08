import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";
import type { Event } from "@/types/meeting";
import { Switch } from "./ui/switch";
import { cn } from "./ui/utils";

interface BookMeetingDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  addMeeting: (meeting: Event) => void;
}

export function BookEventDialog({
  dialogOpen,
  setDialogOpen,
  addMeeting,
}: BookMeetingDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isMeeting, setIsMeeting] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState(""); // "HH:MM"
  const [duration, setDuration] = useState("");

  const [timeOpen, setTimeOpen] = useState(false);

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${String(h).padStart(2, "0")}:${m}`;
  });

  function toUTC(d: Date, timeStr: string) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      hours,
      minutes,
      0,
      0
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto w-md">
        <DialogHeader>
          <DialogTitle>Schedule an Event</DialogTitle>
          <DialogDescription>
            Fill out the details to create a new event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <Label>Event Title</Label>
            <Input
              placeholder="Meeting with team"
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Discuss the project plan"
              className="mt-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* DATE + TIME + DURATION */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-2 w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {date ? date.toLocaleDateString() : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) =>
                      d < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Time</Label>
              <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-2 w-full justify-start text-left font-normal",
                      !time && "text-muted-foreground"
                    )}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {time || "Select time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-32 p-0 h-60 overflow-y-auto overscroll-contain"
                  align="start"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col p-1">
                    {timeOptions.map((t) => (
                      <Button
                        key={t}
                        type="button"
                        variant={time === t ? "default" : "ghost"}
                        size="sm"
                        className="w-full shrink-0 justify-start font-normal"
                        onClick={() => {
                          setTime(t);
                          setTimeOpen(false);
                        }}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting switch */}
          <div className="flex items-center space-x-2 mt-4">
            <Label>Create a Meeting</Label>
            <Switch checked={isMeeting} onCheckedChange={setIsMeeting} />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>

            <Button
              disabled={!title || !date || !time || !duration}
              onClick={() => {
                if (!date || !time) return;
                const payload: Event = {
                  id: crypto.randomUUID(),
                  title,
                  description,
                  dateTime: toUTC(date, time),
                  duration: Number(duration),
                  isMeeting,
                  attendees: [],
                  status: "scheduled",
                };

                addMeeting(payload);
                setDialogOpen(false);
                setTitle("");
                setDescription("");
                setDate(undefined);
                setTime("");
                setDuration("");
                setIsMeeting(false);
              }}
            >
              Book
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
