"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Plus, Calendar, Flag, AlignLeft, FolderOpen } from "lucide-react";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Separator } from "@/app/components/ui/separator";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Case } from "@/types/cases";
import { Task } from "@/types/tasks";

export default function AddNewTask({ caseId }: { caseId?: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(
    caseId ?? null
  );
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");

  const queryClient = useQueryClient();

  const casesQuery = useQuery<Case[]>({
    queryKey: ["case"],
    queryFn: async () => {
      const res = await axios.get("/api/cases/get-cases");
      return res.data.cases;
    },
  });

  const addTask = useMutation({
    mutationFn: async (task: Task) => {
      await axios.post("/api/tasks", task);
    },
    onMutate: async (newTask: Task) => {
      await queryClient.cancelQueries({
        queryKey: ["caseTasks", caseId],
      });
      await queryClient.cancelQueries({ queryKey: ["allTasks"] });

      const prevCaseTasks = queryClient.getQueryData<Task[]>([
        "caseTasks",
        caseId,
      ]);
      const prevAllTasks = queryClient.getQueryData<Task[]>(["allTasks"]);

      const optimisticTask = { ...newTask };

      queryClient.setQueryData(["caseTasks", caseId], (old: Task[] = []) => [
        ...old,
        optimisticTask,
      ]);

      queryClient.setQueryData(["allTasks"], (old: Task[] = []) => [
        ...old,
        optimisticTask,
      ]);

      return { prevCaseTasks, prevAllTasks };
    },
    onError: (_err, _newTask, context) => {
      queryClient.setQueryData(["caseTasks", caseId], context?.prevCaseTasks);
      queryClient.setQueryData(["allTasks"], context?.prevAllTasks);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["caseTasks", caseId] }),
        queryClient.invalidateQueries({ queryKey: ["allTasks"] }),
      ]);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("");
    setDueDate("");
    if (!caseId) setSelectedCaseId(null);
  };

  const submitTask = async () => {
    setDialogOpen(false);
    const payload: Task = {
      id: Date.now(),
      userId: "no",
      title,
      description,
      priority,
      caseName:
        casesQuery?.data?.find((p) => p.id === selectedCaseId)?.name || "",
      dueDate: dueDate || null,
      status: "in-progress",
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      caseId: selectedCaseId,
    };

    addTask.mutate(payload);
    resetForm();
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus />
          New Task
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Task</DialogTitle>
          <DialogDescription>Add a new task to this case.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Task Title</Label>
            <Input
              placeholder="e.g. Review designs for TechCorp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
              Description
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              placeholder="Add more details about this task..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Project (only if no caseId provided) */}
          {!caseId && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                Case
              </Label>
              <Select onValueChange={(val) => setSelectedCaseId(Number(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  {casesQuery?.data?.map((aCase: Case) => (
                    <SelectItem value={String(aCase.id)} key={aCase.id}>
                      {aCase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                Priority
              </Label>
              <Select onValueChange={setPriority} value={priority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
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
                      <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Due Date
                <span className="text-muted-foreground font-normal text-xs">
                  (optional)
                </span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitTask} disabled={!title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
