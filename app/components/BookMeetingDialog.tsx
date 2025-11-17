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

// ----------------------
// Types
// ----------------------
export type MeetingType = "zoom" | "google-meet" | "in-person";

export interface NewMeeting {
    id: string;
    title: string;
    description: string;
    time: string; // "14:00" from <input type="time" />
    duration: number;
    type: MeetingType;
    attendees: { name: string; initials: string }[];
    status: "scheduled";
}

interface BookMeetingDialogProps {
    dialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
    addMeeting: (meeting: NewMeeting) => void;
}

// ----------------------
// Component
// ----------------------
export function BookMeetingDialog({
                                      dialogOpen,
                                      setDialogOpen,
                                      addMeeting,
                                  }: BookMeetingDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [meetingType, setMeetingType] = useState<MeetingType | "">("");
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState("");

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="cursor-pointer">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Book Meeting
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Schedule a Meeting</DialogTitle>
                    <DialogDescription>
                        Fill out the details to book a new meeting
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Title */}
                    <div>
                        <Label>Meeting Title</Label>
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
                            placeholder="Meeting details..."
                            className="mt-2"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Meeting Type */}
                    <div>
                        <Label>Meeting Type</Label>
                        <Select
                            value={meetingType}
                            onValueChange={(v: MeetingType) => setMeetingType(v)}
                        >
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="zoom">Zoom</SelectItem>
                                <SelectItem value="google-meet">Google Meet</SelectItem>
                                <SelectItem value="in-person">In-Person</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Time + Duration */}
                    <div className="grid grid-cols-2 gap-4">
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
                            <Label>Duration (minutes)</Label>
                            <Input
                                type="number"
                                className="mt-2"
                                placeholder="60"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>

                        <Button
                            onClick={() => {
                                if (!meetingType) return;

                                addMeeting({
                                    id: Date.now().toString(),
                                    title,
                                    description,
                                    time,
                                    duration: Number(duration),
                                    type: meetingType,
                                    attendees: [],
                                    status: "scheduled",
                                });

                                // Reset form
                                setDialogOpen(false);
                                setTitle("");
                                setDescription("");
                                setMeetingType("");
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
