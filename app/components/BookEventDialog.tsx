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
import type { NewMeetingInput } from "@/types/meeting";
import { Switch } from "./ui/switch";

interface BookMeetingDialogProps {
    dialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
    addMeeting: (meeting: NewMeetingInput) => void;
}

export function BookEventDialog({
                                      dialogOpen,
                                      setDialogOpen,
                                      addMeeting,
                                  }: BookMeetingDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isMeeting, setIsMeeting] = useState<boolean>(false);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState("");

    function convertTimeToLabel(time24: string) {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        const hour = h % 12 === 0 ? 12 : h % 12;
        return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
    }

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="cursor-pointer">
                    <CalendarIcon className="h-4 w-4 mr-2 cursor-pointer" />
                    Add Event
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[16rem] max-h-[90vh] overflow-y-auto">
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
                            placeholder="Client Sync"
                            className="mt-2"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Event details..."
                            className="mt-2"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* DATE + TIME + DURATION */}
                    <div
                        className={`grid grid-cols-3 gap-4 transition-all duration-200`}
                    >
                        <div>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                className="mt-2"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label>Time</Label>
                            <Input
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

                    <div className="flex items-center space-x-2 mt-4">
                        <Label>Create a Event</Label>
                        <Switch
                            checked={isMeeting}
                            onCheckedChange={(checked) => setIsMeeting(checked as boolean)}
                        />
                    </div>


                    {/* Buttons */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            className="cursor-pointer"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            className="cursor-pointer"
                            onClick={() => {
                                    const payload: NewMeetingInput = {
                                        id: Date.now(),
                                        title,
                                        description,
                                        date,
                                        time: convertTimeToLabel(time),
                                        duration: Number(duration),
                                        isMeeting: isMeeting,
                                        attendees: [],
                                        status: "scheduled",
                                    };
                                    addMeeting(payload);

                                // Reset form
                                setDialogOpen(false);
                                setIsMeeting(false);
                                setTitle("");
                                setDescription("");
                                setDate("");
                                setTime("");
                                setDuration("");
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