"use client";

import { useState } from "react";
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
import { Case } from "@/types/cases";
import type { clients } from "@/types/clients";
import { useUpdateCase } from "./_lib/hooks";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Calendar } from "@/app/components/ui/calendar";
import { cn } from "@/app/components/ui/utils";
import {
  formatDateOnlyString,
  parseDateOnlyString,
} from "@/lib/util/date_utils";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Case</DialogTitle>
          <DialogDescription>Update the case details below.</DialogDescription>
        </DialogHeader>

        {/* Mount a fresh form per open so fields initialize from the latest
            case without a setState-in-effect reset. */}
        {open && (
          <CaseEditForm
            key={aCase.id}
            aCase={aCase}
            clients={clients}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CaseEditForm({
  aCase,
  clients,
  onOpenChange,
}: {
  aCase: Case;
  clients: clients[];
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(aCase.name);
  const [clientId, setClientId] = useState<string>(
    aCase.clientId ? String(aCase.clientId) : "none"
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    aCase.dueDate ? parseDateOnlyString(aCase.dueDate) : undefined
  );
  const [priority, setPriority] = useState(aCase.priority);
  const [status, setStatus] = useState(aCase.status);

  const updateMutation = useUpdateCase();

  return (
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
            <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
          </PopoverContent>
        </Popover>
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
          onClick={() =>
            updateMutation.mutate(
              {
                id: aCase.id,
                name,
                dueDate: dueDate ? formatDateOnlyString(dueDate) : undefined,
                priority,
                status,
                clientId: clientId === "none" ? null : Number(clientId),
              },
              { onSuccess: () => onOpenChange(false) }
            )
          }
          disabled={updateMutation.isPending || !name.trim()}
        >
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
