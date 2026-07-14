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
import { Plus } from "lucide-react";
import { Label } from "@/app/components/ui/label";
import type { clients } from "@/types/clients";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCase } from "@/lib/workspace/cases";
import { Case } from "@/types/cases";

export function CaseCreateDialog({ clients }: { clients: clients[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [client, setClient] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");

  const queryClient = useQueryClient();

  const createNewCase = useMutation({
    mutationFn: async (aCase: Case) => {
      await createCase(aCase);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });

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
      dueDate: dueDate || null,
      status: "active",
      stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
    });

    setDialogOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Label>Due Date</Label>
              <Input
                type="date"
                className="mt-2"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                className="cursor-pointer"
                variant="outline"
                onClick={() => setDialogOpen(false)}
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
