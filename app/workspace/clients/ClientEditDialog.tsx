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
import { Textarea } from "@/app/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateExistingClient } from "@/lib/clients";
import type { clients, UpdateClientInput } from "@/types/clients";

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
  const [name, setName] = useState(aClient.name);
  const [email, setEmail] = useState(aClient.email);
  const [phone, setPhone] = useState(aClient.phone ?? "");
  const [notes, setNotes] = useState(aClient.notes ?? "");

  useEffect(() => {
    if (open) {
      setName(aClient.name);
      setEmail(aClient.email);
      setPhone(aClient.phone ?? "");
      setNotes(aClient.notes ?? "");
    }
  }, [open, aClient]);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateClientInput) => {
      await updateExistingClient(input);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["clients"] });

      const previousClients =
        queryClient.getQueryData<clients[]>(["clients"]) ?? [];

      queryClient.setQueryData<clients[]>(
        ["clients"],
        previousClients.map((c) =>
          c.id === input.id
            ? {
                ...c,
                name: input.name ?? c.name,
                email: input.email ?? c.email,
                phone: input.phone ?? c.phone,
                notes: input.notes ?? c.notes,
              }
            : c
        )
      );

      onOpenChange(false);

      return { previousClients };
    },
    onError: (_err, _input, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(["clients"], context.previousClients);
      }
      alert("Failed to update client");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update the client details below.
          </DialogDescription>
        </DialogHeader>

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
              onClick={() =>
                updateMutation.mutate({
                  id: aClient.id,
                  name,
                  email,
                  phone,
                  notes,
                })
              }
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
