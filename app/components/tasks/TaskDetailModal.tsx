import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import {
  Calendar,
  Clock,
  Flag,
  User,
  Tag,
  Paperclip,
  MessageSquare,
  Trash2,
  Edit,
  CheckCircle,
  Plus,
  FileText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface Task {
  id: number;
  title: string;
  project: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in-progress" | "completed";
  dueDate: string;
  assignee: string;
}

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (task: Task) => void;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  initials: string;
}

const mockSubtasks: Subtask[] = [
  { id: "1", title: "Gather client feedback", completed: true },
  { id: "2", title: "Review design specifications", completed: true },
  { id: "3", title: "Create wireframe annotations", completed: false },
  { id: "4", title: "Schedule design review meeting", completed: false },
];

const mockComments: Comment[] = [
  {
    id: "1",
    author: "John Doe",
    initials: "JD",
    content: "I've reviewed the initial wireframes. Looks good overall, but we should adjust the navigation layout.",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    author: "Sarah Johnson",
    initials: "SJ",
    content: "Agreed! I'll make those changes and update the file by EOD.",
    timestamp: "1 hour ago",
  },
];

const mockAttachments = [
  { id: "1", name: "wireframe_v2.fig", size: "3.2 MB" },
  { id: "2", name: "client_feedback.pdf", size: "1.5 MB" },
];

export function TaskDetailModal({ task, open, onOpenChange, onUpdate }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(
    "Review the latest wireframes from the design team and provide feedback on the user flow, layout, and component hierarchy. Make sure to check accessibility considerations and mobile responsiveness."
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(mockSubtasks);
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

  if (!task) return null;

  const toggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([
        ...subtasks,
        {
          id: String(subtasks.length + 1),
          title: newSubtask,
          completed: false,
        },
      ]);
      setNewSubtask("");
    }
  };

  const addComment = () => {
    if (newComment.trim()) {
      setComments([
        ...comments,
        {
          id: String(comments.length + 1),
          author: "You",
          initials: "ME",
          content: newComment,
          timestamp: "Just now",
        },
      ]);
      setNewComment("");
    }
  };

  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  const subtaskProgress = (completedSubtasks / subtasks.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-xl mb-2"
                />
              ) : (
                <DialogTitle className="text-2xl mb-2">{task.title}</DialogTitle>
              )}
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {task.project}
                </Badge>
                <Badge
                  className={
                    task.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : task.status === "in-progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }
                >
                  {task.status === "in-progress"
                    ? "In Progress"
                    : task.status === "completed"
                    ? "Completed"
                    : "To Do"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? "Save" : "Edit"}
              </Button>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <Label className="flex items-center mb-2">
                <FileText className="h-4 w-4 mr-2" />
                Description
              </Label>
              {isEditing ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              ) : (
                <p className="text-sm text-gray-700">{description}</p>
              )}
            </div>

            <Separator />

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Subtasks ({completedSubtasks}/{subtasks.length})
                </Label>
                <span className="text-xs text-gray-600">
                  {Math.round(subtaskProgress)}% complete
                </span>
              </div>

              <div className="space-y-2 mb-3">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => toggleSubtask(subtask.id)}
                    />
                    <span
                      className={`text-sm flex-1 ${
                        subtask.completed
                          ? "line-through text-gray-500"
                          : "text-gray-900"
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Add a subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSubtask()}
                  className="flex-1"
                />
                <Button size="sm" onClick={addSubtask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Attachments */}
            <div>
              <Label className="flex items-center mb-3">
                <Paperclip className="h-4 w-4 mr-2" />
                Attachments ({mockAttachments.length})
              </Label>
              <div className="space-y-2">
                {mockAttachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.size}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Attachment
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <div>
              <Label className="mb-2 block">Status</Label>
              <Select defaultValue={task.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className="flex items-center mb-2">
                <Flag className="h-4 w-4 mr-2" />
                Priority
              </Label>
              <Select defaultValue={task.priority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center">
                      <Flag className="h-4 w-4 mr-2 text-red-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center">
                      <Flag className="h-4 w-4 mr-2 text-yellow-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center">
                      <Flag className="h-4 w-4 mr-2 text-gray-500" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div>
              <Label className="flex items-center mb-2">
                <User className="h-4 w-4 mr-2" />
                Assignee
              </Label>
              <Select defaultValue={task.assignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="You">You</SelectItem>
                  <SelectItem value="Team">Team</SelectItem>
                  <SelectItem value="John Doe">John Doe</SelectItem>
                  <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div>
              <Label className="flex items-center mb-2">
                <Calendar className="h-4 w-4 mr-2" />
                Due Date
              </Label>
              <Input type="date" defaultValue="2025-11-15" />
            </div>

            <Separator />

            {/* Tags */}
            <div>
              <Label className="flex items-center mb-2">
                <Tag className="h-4 w-4 mr-2" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Design</Badge>
                <Badge variant="secondary">Urgent</Badge>
                <Button variant="outline" size="sm" className="h-6">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <Separator />

            {/* Activity */}
            <div>
              <Label className="mb-2 block text-xs text-gray-600">Activity</Label>
              <div className="space-y-2 text-xs text-gray-600">
                <p>Created 3 days ago</p>
                <p>Last updated 2 hours ago</p>
                <p>2 comments</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}