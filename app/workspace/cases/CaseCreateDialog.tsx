"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/app/components/ui/select";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { Label } from "@/app/components/ui/label";
import type { clients } from "@/types/clients";
import { useCreateCase } from "./_lib/hooks";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Calendar } from "@/app/components/ui/calendar";
import { cn } from "@/app/components/ui/utils";
import { formatDateOnlyString } from "@/lib/util/date_utils";

export function CaseCreateDialog({ clients }: { clients: clients[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [client, setClient] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState("medium");

  const createNewCase = useCreateCase();

  const resetForm = () => {
    setCaseName("");
    setClient(null);
    setDueDate(undefined);
    setPriority("medium");
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const submit = async () => {
    const trimmedName = caseName.trim();
    if (!trimmedName) {
      return;
    }

    createNewCase.mutate({
      id: 1,
      name: trimmedName,
      clientId: client ? Number(client) : null,
      priority,
      dueDate: dueDate ? formatDateOnlyString(dueDate) : null,
      status: "active",
      stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
    });

    handleOpenChange(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription>
              Track tasks, files, and progress for a new case
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Case Name</Label>
              <Input
                placeholder="Website Redesign"
                className="mt-2"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                aria-invalid={!caseName.trim()}
              />
              {!caseName.trim() && (
                <p className="text-xs text-destructive mt-1">
                  Case name is required
                </p>
              )}
            </div>

            <div>
              <Label>
                Client{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  (optional)
                </span>
              </Label>
              <Select
                onValueChange={(val) => setClient(val === "none" ? null : val)}
              >
                <SelectTrigger className="mt-2 cursor-pointer">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-2 cursor-pointer">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                Due Date{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  (optional)
                </span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "border-input data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] mt-2 h-9 cursor-pointer",
                      !dueDate && "text-muted-foreground"
                    )}
                    data-placeholder={!dueDate ? "" : undefined}
                  >
                    {dueDate ? dueDate.toLocaleDateString() : "Select date"}
                    <CalendarIcon className="size-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                className="cursor-pointer"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="cursor-pointer"
                onClick={submit}
                disabled={!caseName.trim()}
              >
                Create Case
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
