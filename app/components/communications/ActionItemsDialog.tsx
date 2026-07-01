import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  User,
  Trash2,
} from "lucide-react";
import type { ActionItem } from "@/types/communications";

interface ActionItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  existingItems: ActionItem[];
}

const mockActionItems: ActionItem[] = [
  {
    id: "1",
    title: "Review and approve Q4 timeline",
    description: "Client needs timeline approval by end of week",
    status: "pending",
    priority: "high",
    dueDate: "Nov 15, 2025",
    assignee: "You",
    tags: ["urgent", "approval"],
  },
  {
    id: "2",
    title: "Provide API documentation",
    description: "Send comprehensive API docs for integration phase",
    status: "in-progress",
    priority: "high",
    dueDate: "Nov 13, 2025",
    assignee: "Tech Team",
    tags: ["technical", "documentation"],
  },
  {
    id: "3",
    title: "Schedule weekly check-in call",
    description: "Set up recurring meeting for project updates",
    status: "completed",
    priority: "medium",
    dueDate: "Nov 10, 2025",
    assignee: "You",
    tags: ["meeting"],
  },
];

export function ActionItemsDialog({
  open,
  onOpenChange,
  clientName,
  existingItems,
}: ActionItemsDialogProps) {
  const [items, setItems] = useState<ActionItem[]>(
    existingItems.length > 0 ? existingItems : mockActionItems
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    priority: "medium" as ActionItem["priority"],
    dueDate: "",
    assignee: "You",
  });

  const handleAddItem = () => {
    if (newItem.title.trim()) {
      const item: ActionItem = {
        id: String(items.length + 1),
        title: newItem.title,
        description: newItem.description,
        status: "pending",
        priority: newItem.priority,
        dueDate: newItem.dueDate,
        assignee: newItem.assignee,
        tags: [],
      };
      setItems([item, ...items]);
      setNewItem({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        assignee: "You",
      });
      setShowAddForm(false);
    }
  };

  const handleToggleStatus = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === "completed"
                  ? "pending"
                  : item.status === "pending"
                    ? "in-progress"
                    : "completed",
            }
          : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const getPriorityColor = (priority: ActionItem["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300";
      case "low":
        return "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300";
    }
  };

  const getStatusIcon = (status: ActionItem["status"]) => {
    if (status === "completed") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const completedCount = items.filter((i) => i.status === "completed").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Action Items - {clientName}</DialogTitle>
          <DialogDescription>
            Manage action items identified from conversations
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              Total Items
            </p>
            <p className="text-2xl text-blue-900 dark:text-blue-200">
              {items.length}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-600 dark:text-green-400 mb-1">
              Completed
            </p>
            <p className="text-2xl text-green-900 dark:text-green-200">
              {completedCount}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">
              Pending
            </p>
            <p className="text-2xl text-orange-900 dark:text-orange-200">
              {pendingCount}
            </p>
          </div>
        </div>

        {/* Add New Item */}
        {!showAddForm ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Action Item
          </Button>
        ) : (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Enter action item title..."
                value={newItem.title}
                onChange={(e) =>
                  setNewItem({ ...newItem, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Add details..."
                rows={2}
                value={newItem.description}
                onChange={(e) =>
                  setNewItem({ ...newItem, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newItem.priority}
                  onValueChange={(v: "low" | "medium" | "high") =>
                    setNewItem({ ...newItem, priority: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newItem.dueDate}
                  onChange={(e) =>
                    setNewItem({ ...newItem, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={newItem.assignee}
                  onValueChange={(v) => setNewItem({ ...newItem, assignee: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="You">You</SelectItem>
                    <SelectItem value="Tech Team">Tech Team</SelectItem>
                    <SelectItem value="Design Team">Design Team</SelectItem>
                    <SelectItem value="Project Manager">
                      Project Manager
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        )}

        {/* Action Items List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${
                  item.status === "completed"
                    ? "bg-muted/50 opacity-75"
                    : "bg-card"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => handleToggleStatus(item.id)}
                    className="mt-0.5 hover:scale-110 transition-transform"
                  >
                    {getStatusIcon(item.status)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4
                        className={`text-sm font-medium ${
                          item.status === "completed"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.title}
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {item.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                      {item.status === "in-progress" && (
                        <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                          In Progress
                        </Badge>
                      )}
                      {item.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {item.dueDate}
                        </Badge>
                      )}
                      {item.assignee && (
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          {item.assignee}
                        </Badge>
                      )}
                      {item.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
