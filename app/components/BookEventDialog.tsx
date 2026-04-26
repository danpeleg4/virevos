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
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Event } from "@/types/meeting";
import { Switch } from "./ui/switch";

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
  const [date, setDate] = useState(""); // "YYYY-MM-DD"
  const [time, setTime] = useState(""); // "HH:MM"
  const [duration, setDuration] = useState("");

  function toUTC(dateStr: string, timeStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Local datetime → internally stored as UTC
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
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
              <Input
                placeholder="Select date"
                type="date"
                className="mt-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Time</Label>
              <Input
                placeholder="Select time"
                type="time"
                className="mt-2"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
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
              onClick={() => {
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
                setDate("");
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
