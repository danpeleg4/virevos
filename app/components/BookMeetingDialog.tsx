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
import type { MeetingType, NewMeetingInput } from "@/types/meeting";
import {useQuery} from "@tanstack/react-query";
import axios from "axios";

interface BookMeetingDialogProps {
    dialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
    addMeeting: (meeting: NewMeetingInput) => void;
}

export function BookMeetingDialog({
                                      dialogOpen,
                                      setDialogOpen,
                                      addMeeting,
                                  }: BookMeetingDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [meetingType, setMeetingType] = useState<string>("");
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

    const getMeetingTypes = useQuery<MeetingType[]>({
        queryKey: ["meetingTypes"],
        queryFn: async () => {
            const res = await axios.get('/api/meetings/meeting-types')
            return res.data
        }
    })

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
                                if (meetingType) {
                                    const payload: NewMeetingInput = {
                                        id: Date.now(),
                                        title,
                                        description,
                                        date,
                                        time: convertTimeToLabel(time),
                                        duration: Number(duration),
                                        type: meetingType,
                                        attendees: [],
                                        status: "scheduled",
                                    };
                                    addMeeting(payload);
                                } else {
                                    if (!date || !time) return;
                                    const payload: NewMeetingInput = {
                                        id: Date.now(),
                                        title,
                                        description,
                                        date,
                                        time: convertTimeToLabel(time),
                                        duration: Number(duration),
                                        type: "custom",
                                        attendees: [],
                                        status: "scheduled",
                                    };
                                    addMeeting(payload);
                                }

                                // Reset form
                                setDialogOpen(false);
                                setTitle("");
                                setDescription("");
                                setMeetingType("");
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