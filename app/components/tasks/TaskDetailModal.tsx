"use client"

import {useEffect, useState} from "react";
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
  Flag,
  Tag,
  Paperclip,
  Trash2,
  Edit,
  Plus,
  FileText,
} from "lucide-react";

const mockAttachments = [
  { id: "1", name: "wireframe_v2.fig", size: "3.2 MB" },
  { id: "2", name: "client_feedback.pdf", size: "1.5 MB" },
];

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || "");
  const [description, setDescription] = useState("Review the latest wireframes from the design team and provide feedback on the user flow, layout, and component hierarchy. Make sure to check accessibility considerations and mobile responsiveness.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="m-4 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-xl mb-2 max-w-sm w-full"
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
                  className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? "Save" : "Edit"}
              </Button>
              <Button className="cursor-pointer" variant="outline" size="sm">
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