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
import { Calendar, Flag, Trash2, FileText } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  changePriorityStatus,
  deleteTask,
  updateTaskDueDate,
  updateTaskStatus,
} from "@/lib/server_actions/tasks";
import { Task, TaskDetailModalProps } from "@/types/tasks";

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
    if (task?.dueDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDueDate(task.dueDate.slice(0, 10)); // ISO → yyyy-mm-dd
    } else {
      setDueDate("");
    }
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

      // Optimistic update for project-specific tasks
      queryClient.setQueryData<Task[]>(queryKey, (old = []) =>
        old.map((t) => (t.id === taskId ? { ...t, status } : t))
      );

      // Optimistic update for allTasks
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
    mutationFn: ({ taskId, dueDate }: { taskId: number; dueDate: string }) =>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="m-4 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{task?.title}</DialogTitle>
              <div className="flex items-center space-x-2">
                <Badge
                  className={
                    status === "completed"
                      ? "bg-green-100 text-green-700"
                      : status === "in-progress"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                  }
                >
                  {status === "in-progress"
                    ? "In Progress"
                    : status === "completed"
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
                onClick={() => deleteSomeTask.mutate()}
              >
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
              <p className="text-sm text-gray-700">{task?.description}</p>
            </div>

            <Separator />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <div>
              <Label className="mb-2 block">Status</Label>
              <Select
                value={status}
                onValueChange={(newStatus) => {
                  setStatus(newStatus);
                  changeTaskStatus.mutate({
                    status: newStatus,
                    taskId: task.id,
                  });
                }}
              >
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
              <Select
                value={priority}
                defaultValue={task?.priority}
                onValueChange={(newStatus) => {
                  setPriority(newStatus);
                  changeThePriorityStatus.mutate({
                    priority: newStatus,
                    taskId: task.id,
                  });
                }}
              >
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
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={() =>
                  changeDueDate.mutate({
                    taskId: task.id,
                    dueDate: dueDate,
                  })
                }
              />
            </div>

            <Separator />

            {/* Activity */}
            <div>
              <Label className="mb-2 block text-xs text-gray-600">
                Activity
              </Label>
              <div className="space-y-2 text-xs text-gray-600">
                <p>Created {timeAgo(task?.createdAt)}</p>
                <p>Last updated {timeAgo(task?.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
