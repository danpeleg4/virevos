import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Plus, Video, Users, Clock, Copy, ExternalLink, Edit, Trash2 } from "lucide-react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createMeetsType, updateActiveMeetingType} from "@/lib/server_actions/calendar";
import axios from "axios";

interface MeetingType {
  id: string;
  name: string;
  duration: number;
  description: string;
  color: string;
  platform: "zoom" | "google-meet" | "In-Person";
  bookingLink?: string;
  active: boolean;
  maxPerDay?: number;
}

const mockMeetingTypes: MeetingType[] = [
  {
    id: "1",
    name: "Zoom",
    duration: 30,
    description: "Initial consultation to understand client needs and explore how Virevos can help",
    color: "blue",
    platform: "zoom",
    bookingLink: "Virevos.com/book/discovery-call",
    active: true,
    maxPerDay: 3,
  },
  {
    id: "2",
    name: "Google Meet",
    duration: 30,
    description: "Comprehensive onboarding session for new clients",
    color: "green",
    platform: "google-meet",
    bookingLink: "Virevos.com/book/onboarding",
    active: true,
    maxPerDay: 3,
  },
  {
    id: "3",
    name: "In-Person",
    duration: 30,
    description: "Initial consultation to understand client needs and explore how Virevos can help",
    color: "purple",
    platform: "In-Person",
    active: true,
    maxPerDay: 3,
  }
];

export function MeetingTypes() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>(mockMeetingTypes);
  const [isCreating, setIsCreating] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [platform, setPlatform] = useState<"zoom" | "google-meet" | "In-Person">("zoom");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [maxBookings, setMaxBookings] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  const getMeetingTypes = useQuery({
    queryKey: ["meetingTypes"],
    queryFn: async () => {
      const res = await axios.get('/api/meetings/meeting-types')
      return res.data
    }
  })

  const createMeetingType = useMutation({
    mutationFn: (data: {
      name: string;
      duration: number;
      description: string;
      color: string;
      platform: "zoom" | "google-meet" | "In-Person";
      maxBookings?: number
    }) => createMeetsType(data),
    onMutate: async (newType) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["meetingTypes"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<MeetingType[]>(["meetingTypes"]);

      // Optimistically update
      queryClient.setQueryData(["meetingTypes"], old => [
        ...(old || []),
        {
          id: crypto.randomUUID(), // temporary ID for optimistic update
          active: true,
          maxPerDay: newType.maxBookings,
          bookingLink: undefined,
          ...newType,
        }
      ]);

      return { previous };
    },
    onError: (_err, _newType, context: any) => {
      // Revert on error
      if (context?.previous) {
        queryClient.setQueryData(["meetingTypes"], context.previous);
      }
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["meetingTypes"] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      // call your API to update active
      await updateActiveMeetingType(id, active)
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["meetingTypes"] });

      const previous = queryClient.getQueryData<MeetingType[]>(["meetingTypes"]);

      queryClient.setQueryData<MeetingType[]>(["meetingTypes"], old =>
          old?.map(type =>
              type.id === id ? { ...type, active: !type.active } : type
          )
      );

      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      // rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["meetingTypes"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["meetingTypes"] });
    }
  });


  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700 border-blue-200",
      green: "bg-green-100 text-green-700 border-green-200",
      purple: "bg-purple-100 text-purple-700 border-purple-200",
      orange: "bg-orange-100 text-orange-700 border-orange-200",
    };
    return colors[color] || colors.blue;
  };

  const getPlatformIcon = (platform: string) => {
    return <Video className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            Create different meeting types with custom durations, descriptions, and booking links
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Meeting Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Meeting Name</Label>
                <Input id="name" placeholder="e.g., Discovery Call" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select defaultValue="30">
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select defaultValue="zoom">
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="google-meet">Google Meet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this meeting for?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select defaultValue="blue">
                  <SelectTrigger id="color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-per-day">Max Bookings Per Day (Optional)</Label>
                <Input
                  id="max-per-day"
                  type="number"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  createMeetingType.mutate({
                    name,
                    duration,
                    description,
                    color,
                    platform,
                    maxBookings
                  });
                  setIsCreating(false);
                  setName(""); setDuration(30); setPlatform("zoom");
                  setDescription(""); setColor("blue"); setMaxBookings(undefined);
                }}>
                  Create Meeting Type
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {getMeetingTypes?.data?.map((type: MeetingType) => (
          <Card key={type.id} className={`border-l-4 ${type.active ? '' : 'opacity-60'}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                    <Badge className={getColorClass(type.color)}>
                      {type.duration} min
                    </Badge>
                    {type.maxPerDay && (
                      <Badge variant="outline">
                        Max {type.maxPerDay}/day
                      </Badge>
                    )}
                    {!type.active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <CardDescription>{type.description}</CardDescription>
                </div>
                <Switch
                  checked={type.active}
                  onCheckedChange={() => toggleActiveMutation.mutate({ id: type.id, active: !type.active })}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4 text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {type.duration} minutes
                    </div>
                    <div className="flex items-center">
                      {getPlatformIcon(type.platform)}
                      <span className="ml-1 capitalize">
                        {type.platform.replace("-", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {
                    type.bookingLink ? (
                        <Input
                            readOnly
                            value={`https://${type.bookingLink}`}
                            className="flex-1 text-sm bg-gray-50"
                        />
                    ) : null
                  }
                  <Button size="sm" variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Customize Questions
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 ml-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
