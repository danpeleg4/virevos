import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Clock, Plus, Trash2, Calendar, Brain } from "lucide-react";
import { Separator } from "../ui/separator";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

export function AvailabilitySettings() {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({
    Monday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
    Tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
    Wednesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
    Thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
    Friday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
    Saturday: { enabled: false, slots: [] },
    Sunday: { enabled: false, slots: [] },
  });

  const [bufferBefore, setBufferBefore] = useState("15");
  const [bufferAfter, setBufferAfter] = useState("10");
  const [maxMeetingsPerDay, setMaxMeetingsPerDay] = useState("8");
  const [maxHoursPerDay, setMaxHoursPerDay] = useState("6");
  const [workloadAware, setWorkloadAware] = useState(true);
  const [autoDeclineConflicts, setAutoDeclineConflicts] = useState(true);

  const toggleDay = (day: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        enabled: !availability[day].enabled,
      },
    });
  };

  const addTimeSlot = (day: string) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        slots: [...availability[day].slots, { start: "09:00", end: "17:00" }],
      },
    });
  };

  const removeTimeSlot = (day: string, index: number) => {
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        slots: availability[day].slots.filter((_, i) => i !== index),
      },
    });
  };

  const updateTimeSlot = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    const newSlots = [...availability[day].slots];
    newSlots[index][field] = value;
    setAvailability({
      ...availability,
      [day]: {
        ...availability[day],
        slots: newSlots,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Weekly Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Weekly Availability
          </CardTitle>
          <CardDescription>
            Set your available hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={availability[day].enabled}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  <Label className="text-sm">{day}</Label>
                </div>
                {availability[day].enabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addTimeSlot(day)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time
                  </Button>
                )}
              </div>

              {availability[day].enabled && (
                <div className="space-y-2 ml-11">
                  {availability[day].slots.map((slot, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) =>
                          updateTimeSlot(day, index, "start", e.target.value)
                        }
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) =>
                          updateTimeSlot(day, index, "end", e.target.value)
                        }
                        className="w-32"
                      />
                      {availability[day].slots.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeTimeSlot(day, index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Buffer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-green-600" />
            Buffer Between Meetings
          </CardTitle>
          <CardDescription>
            Add time before and after meetings for preparation and follow-up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buffer-before">Buffer Before (minutes)</Label>
              <Select value={bufferBefore} onValueChange={setBufferBefore}>
                <SelectTrigger id="buffer-before">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer-after">Buffer After (minutes)</Label>
              <Select value={bufferAfter} onValueChange={setBufferAfter}>
                <SelectTrigger id="buffer-after">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Example:</strong> With 15 min before and 10 min after, a
              30-minute meeting will block 55 minutes on your calendar (9:00-9:55
              instead of 9:00-9:30).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Workload Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            Smart Workload Management
            <Badge className="ml-2 bg-purple-100 text-purple-700">AI</Badge>
          </CardTitle>
          <CardDescription>
            Automatically manage your meeting load to prevent burnout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Workload-Aware Scheduling</Label>
              <p className="text-sm text-gray-600">
                AI considers your task load when suggesting meeting times
              </p>
            </div>
            <Switch checked={workloadAware} onCheckedChange={setWorkloadAware} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-meetings">Max Meetings Per Day</Label>
              <Select
                value={maxMeetingsPerDay}
                onValueChange={setMaxMeetingsPerDay}
              >
                <SelectTrigger id="max-meetings">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 meetings</SelectItem>
                  <SelectItem value="6">6 meetings</SelectItem>
                  <SelectItem value="8">8 meetings</SelectItem>
                  <SelectItem value="10">10 meetings</SelectItem>
                  <SelectItem value="999">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-hours">Max Meeting Hours Per Day</Label>
              <Select value={maxHoursPerDay} onValueChange={setMaxHoursPerDay}>
                <SelectTrigger id="max-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="5">5 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="999">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-Decline Conflicts</Label>
              <p className="text-sm text-gray-600">
                Automatically decline new meetings that exceed your limits
              </p>
            </div>
            <Switch
              checked={autoDeclineConflicts}
              onCheckedChange={setAutoDeclineConflicts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
