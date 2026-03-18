"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Calendar, Flag, Trash2, AlignLeft, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  changePriorityStatus,
  deleteTask,
  updateTaskDueDate,
  updateTaskStatus,
} from "@/lib/tasks";
import { Task, TaskDetailModalProps } from "@/types/tasks";

const STATUS_CONFIG = {
  completed: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
  "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-700 border-blue-200" },
  todo: { label: "To Do", className: "bg-gray-100 text-gray-600 border-gray-200" },
} as const;

const PRIORITY_CONFIG = {
  high: { label: "High", color: "text-red-500" },
  medium: { label: "Medium", color: "text-yellow-500" },
  low: { label: "Low", color: "text-gray-400" },
} as const;

export function TaskDetailModal({
  projectId,
  task,
  open,
  onOpenChange,
}: TaskDetailModalProps) {
  const [status, setStatus] = useState(task?.status);
  const [priority, setPriority] = useState(task?.priority);
  const [dueDate, setDueDate] = useState<string>("");

  const queryKey = ["projectsTasks", projectId];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  }, [task?.id, task?.dueDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(task?.status);
  }, [task?.id, task?.status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPriority(task?.priority);
  }, [task?.id, task?.priority]);

  const queryClient = useQueryClient();

  const deleteSomeTask = useMutation({
    mutationFn: async () => {
      await deleteTask(task.id);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: ["allTasks"] });

      const previousProjectTasks = queryClient.getQueryData<Task[]>(queryKey);
      const previousAllTasks = queryClient.getQueryData<Task[]>(["allTasks"]);

      queryClient.setQueryData<Task[]>(queryKey, (old = []) =>
        old.filter((t) => t.id !== task.id)
      );
      queryClient.setQueryData<Task[]>(["allTasks"], (old = []) =>
        old.filter((t) => t.id !== task.id)
      );

      return { previousProjectTasks, previousAllTasks };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousProjectTasks);
      queryClient.setQueryData(["allTasks"], context?.previousAllTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      onOpenChange(false);
    },
  });

  const changeTaskStatus = useMutation({
    mutationFn: ({ status, taskId }: { status: string; taskId: number }) =>
      updateTaskStatus(status, taskId),
    onMutate: async ({ status, taskId }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: ["allTasks"] });

      const previousProjectTasks = queryClient.getQueryData<Task[]>(queryKey);
      const previousAllTasks = queryClient.getQueryData<Task[]>(["allTasks"]);

      queryClient.setQueryData<Task[]>(queryKey, (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      queryClient.setQueryData<Task[]>(["allTasks"], (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, status } : t))
      );

      return { previousProjectTasks, previousAllTasks };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousProjectTasks);
      queryClient.setQueryData(["allTasks"], context?.previousAllTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
    },
  });

  const changeThePriorityStatus = useMutation({
    mutationFn: async ({
      priority,
      taskId,
    }: {
      priority: string;
      taskId: number;
    }) => changePriorityStatus(taskId, priority),
    onMutate: async ({ priority, taskId }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: ["allTasks"] });

      const previousProjectTasks = queryClient.getQueryData<Task[]>(queryKey);
      const previousAllTasks = queryClient.getQueryData<Task[]>(["allTasks"]);

      queryClient.setQueryData<Task[]>(queryKey, (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, priority } : t))
      );
      queryClient.setQueryData<Task[]>(["allTasks"], (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, priority } : t))
      );

      return { previousProjectTasks, previousAllTasks };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousProjectTasks);
      queryClient.setQueryData(["allTasks"], context?.previousAllTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
    },
  });

  const changeDueDate = useMutation({
    mutationFn: ({ taskId, dueDate }: { taskId: number; dueDate: string | null }) =>
      updateTaskDueDate(taskId, dueDate),
    onMutate: async ({ taskId, dueDate }) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: ["allTasks"] });

      const previousProjectTasks = queryClient.getQueryData<Task[]>(queryKey);
      const previousAllTasks = queryClient.getQueryData<Task[]>(["allTasks"]);

      queryClient.setQueryData<Task[]>(queryKey, (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, dueDate } : t))
      );
      queryClient.setQueryData<Task[]>(["allTasks"], (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, dueDate } : t))
      );

      return { previousProjectTasks, previousAllTasks };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previousProjectTasks);
      queryClient.setQueryData(["allTasks"], context?.previousAllTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
    },
  });

  function timeAgo(date?: Date | string | null) {
    if (!date) return "";

    const parsedDate =
      typeof date === "string" ? new Date(date.replace(" ", "T")) : date;

    const now = new Date();
    const seconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);

    if (seconds < 5) return "just now";

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    const intervals = [
      { label: "year", seconds: 31536000 },
      { label: "month", seconds: 2592000 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 },
    ] as const;

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return rtf.format(-count, interval.label);
      }
    }

    return "just now";
  }

  const statusConfig =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.todo;
  const priorityConfig =
    PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold leading-snug mb-2">
                  {task?.title}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${statusConfig.className}`}
                >
                  {statusConfig.label}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-500 hover:bg-red-50 cursor-pointer shrink-0"
                onClick={() => deleteSomeTask.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x">
          {/* Main content */}
          <div className="sm:col-span-3 px-6 py-5 space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <AlignLeft className="h-3.5 w-3.5" />
                Description
              </Label>
              {task?.description ? (
                <p className="text-sm text-foreground leading-relaxed">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No description provided.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sm:col-span-2 px-6 py-5 space-y-5 bg-muted/20">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(newStatus) => {
                  setStatus(newStatus);
                  changeTaskStatus.mutate({ status: newStatus, taskId: task.id });
                }}
              >
                <SelectTrigger className="h-8 text-sm bg-background">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Flag className="h-3 w-3" />
                Priority
              </Label>
              <Select
                value={priority}
                onValueChange={(newPriority) => {
                  setPriority(newPriority);
                  changeThePriorityStatus.mutate({
                    priority: newPriority,
                    taskId: task.id,
                  });
                }}
              >
                <SelectTrigger className="h-8 text-sm bg-background">
                  <SelectValue>
                    {priorityConfig && (
                      <span className="flex items-center gap-2">
                        <Flag className={`h-3.5 w-3.5 ${priorityConfig.color}`} />
                        {priorityConfig.label}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-red-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-yellow-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-gray-400" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                className="h-8 text-sm bg-background"
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={() =>
                  changeDueDate.mutate({
                    taskId: task.id,
                    dueDate: dueDate || null,
                  })
                }
              />
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Activity
              </Label>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Created {timeAgo(task?.createdAt)}</p>
                <p>Updated {timeAgo(task?.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
