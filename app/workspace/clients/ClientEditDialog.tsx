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
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/app/components/ui/select";
import type { clients } from "@/types/clients";
import { useUpdateClient } from "./_lib/hooks";

type ClientStatus = "active" | "inactive";

function normalizeStatus(value: string | undefined | null): ClientStatus {
  return value === "inactive" ? "inactive" : "active";
}

interface ClientEditDialogProps {
  aClient: clients;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientEditDialog({
  aClient,
  open,
  onOpenChange,
}: ClientEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update the client details below.
          </DialogDescription>
        </DialogHeader>

        {/* Mount a fresh form per open so fields initialize from the latest
            client without a setState-in-effect reset. */}
        {open && (
          <ClientEditForm
            key={aClient.id}
            aClient={aClient}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClientEditForm({
  aClient,
  onOpenChange,
}: {
  aClient: clients;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(aClient.name);
  const [email, setEmail] = useState(aClient.email);
  const [phone, setPhone] = useState(aClient.phone ?? "");
  const [status, setStatus] = useState<ClientStatus>(
    normalizeStatus(aClient.status)
  );
  const [notes, setNotes] = useState(aClient.notes ?? "");

  const updateMutation = useUpdateClient();

  return (
    <div className="space-y-4 mt-2">
      <div>
        <Label>Client Name</Label>
        <Input
          className="mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <Label>Email</Label>
        <Input
          type="email"
          className="mt-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <Label>Phone</Label>
        <Input
          className="mt-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ClientStatus)}
        >
          <SelectTrigger className="mt-2 cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>
          Notes{" "}
          <span className="text-muted-foreground font-normal text-xs">
            (optional)
          </span>
        </Label>
        <Textarea
          className="mt-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
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
          onClick={() => {
            updateMutation.mutate({
              id: aClient.id,
              name,
              email,
              phone,
              status,
              notes,
            });
            onOpenChange(false);
          }}
          disabled={updateMutation.isPending || !name.trim()}
        >
          {updateMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
