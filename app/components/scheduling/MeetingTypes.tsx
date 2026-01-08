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
  DialogDescription,
} from "../ui/dialog";
import { Switch } from "../ui/switch";
import { Plus, Video, Users, Clock, Copy, ExternalLink, Edit, Trash2, Calendar, Mail, Bell, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createMeetsType, deleteMeetsType, updateActiveMeetingType } from "@/lib/server_actions/calendar";
import { MeetingType } from "@/types/meeting";

export function MeetingTypes() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>();
  const [isCreating, setIsCreating] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [platform, setPlatform] = useState<"zoom" | "google-meet" | "In-Person">("zoom");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [maxBookings, setMaxBookings] = useState<number | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
      await updateActiveMeetingType(id, active)
    },
    onMutate: async ({ id, active }: { id: number, active: boolean }) => {
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

  const deleteMeetingType = useMutation({
    mutationFn: async (id: number) => deleteMeetsType(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["meetingTypes"] });

      const previous = queryClient.getQueryData<MeetingType[]>(["meetingTypes"]);

      queryClient.setQueryData<MeetingType[]>(["meetingTypes"], old =>
          old?.filter(type => type.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["meetingTypes"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["meetingTypes"] });
    },
  });

  const sortedMeetingTypes = useMemo(() => {
    if (!getMeetingTypes.data) return [];

    return [...getMeetingTypes.data].sort((a, b) => {
      // active first
      return Number(b.active) - Number(a.active);
    });
  }, [getMeetingTypes.data]);

  const handleEdit = (type: MeetingType) => {
    setEditingType(type);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingType) {
      setMeetingTypes(
          meetingTypes?.map((type) =>
              type.id === editingType.id ? editingType : type
          )
      );
      setIsEditDialogOpen(false);
      setEditingType(null);
    }
  };

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

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select defaultValue="30"
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
                  <Label htmlFor="edit-color">Color</Label>
                  <Select
                      defaultValue="blue"
                      value={color}
                      onValueChange={(val) => setColor(val)}
                  >
                    <SelectTrigger id="edit-color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                          Blue
                        </div>
                      </SelectItem>
                      <SelectItem value="green">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          Green
                        </div>
                      </SelectItem>
                      <SelectItem value="purple">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                          Purple
                        </div>
                      </SelectItem>
                      <SelectItem value="orange">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                          Orange
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-per-day">Max Bookings Per Day (Optional)</Label>
                  <Input
                      id="max-per-day"
                      type="number"
                      placeholder="Leave empty for unlimited"
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
                      maxBookings
                    });

                    setIsCreating(false);
                    setName("");
                    setDuration(30);
                    setDescription("");
                    setColor("blue");
                    setMaxBookings(undefined);
                  }}>Create Meeting Type</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {sortedMeetingTypes?.map((type) => (
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
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Input
                          readOnly
                          value={`https://${type.bookingLink}`}
                          className="flex-1 text-sm bg-gray-50"
                      />
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
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(type)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Customize Questions
                      </Button>
                      <Button onClick={() => deleteMeetingType.mutate(type.id)} size="sm" variant="ghost" className="text-red-600 ml-auto">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          ))}
        </div>

        {/* Edit Meeting Type Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {editingType && (
                <>
                  <DialogHeader>
                    <DialogTitle>Edit Meeting Type</DialogTitle>
                    <DialogDescription>
                      Configure your meeting settings, notifications, and booking options
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="general" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="general" className="cursor-pointer">General</TabsTrigger>
                      <TabsTrigger value="scheduling" className="cursor-pointer">Scheduling</TabsTrigger>
                      <TabsTrigger value="notifications" className="cursor-pointer">Notifications</TabsTrigger>
                    </TabsList>

                    {/* General Tab */}
                    <TabsContent value="general" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Meeting Name</Label>
                        <Input
                            id="edit-name"
                            value={editingType.name}
                            onChange={(e) =>
                                setEditingType({ ...editingType, name: e.target.value })
                            }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                            id="edit-description"
                            value={editingType.description}
                            onChange={(e) =>
                                setEditingType({ ...editingType, description: e.target.value })
                            }
                            rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-duration">Duration</Label>
                          <Select
                              value={editingType.duration.toString()}
                              onValueChange={(value) =>
                                  setEditingType({ ...editingType, duration: parseInt(value) })
                              }
                          >
                            <SelectTrigger id="edit-duration">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="45">45 minutes</SelectItem>
                              <SelectItem value="60">60 minutes</SelectItem>
                              <SelectItem value="90">90 minutes</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-color">Color</Label>
                          <Select
                              value={editingType.color}
                              onValueChange={(value) =>
                                  setEditingType({ ...editingType, color: value })
                              }
                          >
                            <SelectTrigger id="edit-color">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blue">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                  Blue
                                </div>
                              </SelectItem>
                              <SelectItem value="green">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                  Green
                                </div>
                              </SelectItem>
                              <SelectItem value="purple">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                                  Purple
                                </div>
                              </SelectItem>
                              <SelectItem value="orange">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                                  Orange
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-booking-link">Booking Link</Label>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                            <span className="text-sm text-gray-500 mr-1">https://</span>
                            <Input
                                id="edit-booking-link"
                                value={editingType.bookingLink}
                                onChange={(e) =>
                                    setEditingType({ ...editingType, bookingLink: e.target.value })
                                }
                                className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          </div>
                          <Button size="sm" variant="outline">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between p-4 rounded-lg border bg-gray-50 border-gray-200`}>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                              editingType.active
                                  ? "bg-green-100"
                                  : "bg-gray-200"
                          }`}>
                            <CheckCircle2 className={`h-5 w-5 ${
                                editingType.active ? "text-green-600" : "text-gray-400"
                            }`} />
                          </div>
                          <div>
                            <p className={`text-sm text-gray-900`}>
                              Meeting Type Status
                            </p>
                            <p className={`text-xs text-gray-500`}>
                              {editingType.active ? "Active and bookable" : "Inactive and hidden"}
                            </p>
                          </div>
                        </div>
                        <Switch
                            checked={editingType.active}
                            onCheckedChange={(checked) =>
                                setEditingType({ ...editingType, active: checked })
                            }
                        />
                      </div>
                    </TabsContent>

                    {/* Scheduling Tab */}
                    <TabsContent value="scheduling" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="buffer-time">Buffer Time Between Meetings</Label>
                        <Select
                            value={editingType.bufferTime?.toString() || "0"}
                            onValueChange={(value) =>
                                setEditingType({ ...editingType, bufferTime: parseInt(value) })
                            }
                        >
                          <SelectTrigger id="buffer-time">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No buffer</SelectItem>
                            <SelectItem value="5">5 minutes</SelectItem>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="20">20 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Time to prepare between back-to-back meetings
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-per-day">Maximum Bookings Per Day</Label>
                        <Input
                            id="max-per-day"
                            type="number"
                            value={editingType.maxPerDay || ""}
                            onChange={(e) =>
                                setEditingType({
                                  ...editingType,
                                  maxPerDay: e.target.value ? parseInt(e.target.value) : undefined,
                                })
                            }
                            placeholder="Unlimited"
                        />
                        <p className="text-xs text-gray-500">
                          Leave empty for unlimited bookings
                        </p>
                      </div>

                      <div className={`p-4 rounded-lg border bg-blue-50 border-blue-200`}>
                        <div className="flex items-start space-x-3">
                          <Calendar className={`h-5 w-5 mt-0.5 text-blue-600`} />
                          <div>
                            <p className={`text-sm mb-1 text-gray-900`}>
                              Booking Window
                            </p>
                            <p className={`text-xs text-gray-600`}>
                              Configure how far in advance people can book. Available in Availability settings.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border bg-gray-50 border-gray-200`}>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="mb-0">Require Approval</Label>
                          <Switch
                              checked={editingType.requiresApproval || false}
                              onCheckedChange={(checked) =>
                                  setEditingType({ ...editingType, requiresApproval: checked })
                              }
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Bookings require manual approval before being confirmed
                        </p>
                      </div>
                    </TabsContent>

                    {/* Notifications Tab */}
                    <TabsContent value="notifications" className="space-y-4 mt-4">
                      <div className={`p-4 rounded-lg border bg-gray-50 border-gray-200`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Mail className={`h-5 w-5 text-gray-600`} />
                            <div>
                              <Label className="mb-0">Confirmation Email</Label>
                              <p className="text-xs text-gray-500">
                                Send booking confirmation to attendees
                              </p>
                            </div>
                          </div>
                          <Switch
                              checked={editingType.confirmationEmail || false}
                              onCheckedChange={(checked) =>
                                  setEditingType({ ...editingType, confirmationEmail: checked })
                              }
                          />
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg border bg-gray-50 border-gray-200`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Bell className={`h-5 w-5 text-gray-600`} />
                            <div>
                              <Label className="mb-0">Reminder Email</Label>
                              <p className="text-xs text-gray-500">
                                Send reminder 24 hours before meeting
                              </p>
                            </div>
                          </div>
                          <Switch
                              checked={editingType.reminderEmail || false}
                              onCheckedChange={(checked) =>
                                  setEditingType({ ...editingType, reminderEmail: checked })
                              }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Email Template Preview</Label>
                        <div className={`p-4 rounded-lg border bg-white border-gray-200`}>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-900">
                              <strong>Subject:</strong> Your {editingType.name} is confirmed
                            </p>
                            <p className="text-gray-600">
                              Hi [Name],<br /><br />
                              Your {editingType.name} has been scheduled for [Date] at [Time].<br /><br />
                              Duration: {editingType.duration} minutes<br />
                              Location: {editingType.location || "Virtual"}<br /><br />
                              [Meeting Link]
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Footer Actions */}
                  <div className={`flex justify-between items-center pt-4 mt-4 border-t border-gray-200`}>
                    <Button
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => {
                          setIsEditDialogOpen(false);
                          setEditingType(null);
                        }}
                    >
                      Cancel Changes
                    </Button>
                    <div className="flex space-x-2">
                      <Button onClick={handleSaveEdit}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}