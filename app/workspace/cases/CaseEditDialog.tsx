"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/app/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCase } from "@/lib/cases";
import { Case } from "@/types/cases";
import type { clients } from "@/types/clients";

interface CaseEditDialogProps {
  aCase: Case;
  clients: clients[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CaseEditDialog({
  aCase,
  clients,
  open,
  onOpenChange,
}: CaseEditDialogProps) {
  const [name, setName] = useState(aCase.name);
  const [clientId, setClientId] = useState<string>(
    aCase.clientId ? String(aCase.clientId) : "none"
  );
  const [dueDate, setDueDate] = useState(aCase.dueDate ?? "");
  const [priority, setPriority] = useState(aCase.priority);
  const [status, setStatus] = useState(aCase.status);

  useEffect(() => {
    if (open) {
      setName(aCase.name);
      setClientId(aCase.clientId ? String(aCase.clientId) : "none");
      setDueDate(aCase.dueDate ?? "");
      setPriority(aCase.priority);
      setStatus(aCase.status);
    }
  }, [open, aCase]);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      await updateCase({
        id: aCase.id,
        name,
        dueDate: dueDate || undefined,
        priority,
        status,
        clientId: clientId === "none" ? null : Number(clientId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Case</DialogTitle>
          <DialogDescription>
            Update the case details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Case Name</Label>
            <Input
              className="mt-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>
              Client{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-2 cursor-pointer">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
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
            <Input
              type="date"
              className="mt-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-2 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !name.trim()}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
