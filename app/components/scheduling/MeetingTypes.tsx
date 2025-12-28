import {useMemo, useState} from "react";
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
  id: number;
  name: string;
  duration: number;
  description: string | null;
  color: string;
  platform: "zoom" | "google-meet" | "In-Person";
  bookingLink?: string;
  active: boolean;
  maxBookings?: number | null;
}


export function MeetingTypes() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [platform, setPlatform] = useState<"zoom" | "google-meet" | "In-Person">("zoom");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [maxBookings, setMaxBookings] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  const getMeetingTypes = useQuery<MeetingType[]>({
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
      queryClient.setQueryData(["meetingTypes"], (old: MeetingType[] | undefined) => [
        ...(old || []),
        {
          id: Math.floor(Math.random() * 1000000), // temporary ID for optimistic update
          active: true,
          ...newType,
        }
      ]);

      return { previous };
    },
    onError: (_err, _newType, context) => {
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
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      // call your API to update active
      await updateActiveMeetingType(id, active)
    },
    onMutate: async ({ id, active }: {id: number, active: boolean}) => {
      await queryClient.cancelQueries({ queryKey: ["meetingTypes"] });

      const previous = queryClient.getQueryData<MeetingType[]>(["meetingTypes"]);

      queryClient.setQueryData<MeetingType[]>(["meetingTypes"], old =>
          old?.map(type =>
              type.id === id ? { ...type, active } : type
          )
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["meetingTypes"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["meetingTypes"] });
    }
  });

  const sortedMeetingTypes = useMemo(() => {
    if (!getMeetingTypes.data) return [];

    return [...getMeetingTypes.data].sort((a, b) => {
      // active first
      return Number(b.active) - Number(a.active);
    });
  }, [getMeetingTypes.data]);

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700 border-blue-200",
      green: "bg-green-100 text-green-700 border-green-200",
      purple: "bg-purple-100 text-purple-700 border-purple-200",
      orange: "bg-orange-100 text-orange-700 border-orange-200",
    };
    return colors[color] || colors.blue;
  };

  const getPlatformIcon = (platform: "zoom" | "google-meet" | "In-Person" | string) => {
    switch (platform) {
      case "zoom":
      case "google-meet":
        return <Video className="h-4 w-4" />;
      case "In-Person":
        return <Users className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
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
            <Button onClick={() => setIsCreating(true)}>
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
                <Input
                  id="name"
                  placeholder="e.g., Discovery Call"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Select
                    value={duration.toString()}
                    onValueChange={(val) => setDuration(parseInt(val))}
                  >
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
                  <Select
                    value={platform}
                    onValueChange={(val) => setPlatform(val as "zoom" | "google-meet" | "In-Person")}
                  >
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="google-meet">Google Meet</SelectItem>
                      <SelectItem value="In-Person">In-Person</SelectItem>
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Select
                  value={color}
                  onValueChange={(val) => setColor(val)}
                >
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
                  value={maxBookings || ""}
                  onChange={(e) => setMaxBookings(e.target.value ? parseInt(e.target.value) : undefined)}
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
        {sortedMeetingTypes?.slice(0, 5).map((type) => (
          <Card key={type.id} className={`border-l-4 ${type.active ? '' : 'opacity-60'}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                    <Badge className={getColorClass(type.color)}>
                      {type.duration} min
                    </Badge>
                    {type.maxBookings && (
                      <Badge variant="outline">
                        Max {type.maxBookings}/day
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
