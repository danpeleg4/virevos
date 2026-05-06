"use server";

import { CreateClientInput, UpdateClientInput } from "@/types/clients";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { clients } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { assertCanAddClient } from "./plan_limits";
import {
  MAX_NAME,
  MAX_NOTES,
  MAX_PHONE,
  ValidationError,
  optionalString,
  requireEmail,
  requireOneOf,
  requireString,
} from "./validation";

const CLIENT_STATUSES = ["active", "inactive"] as const;

export async function addAClient(body: CreateClientInput) {
  try {
    const user = await currentUser();
    if (!user?.id) throw new ValidationError("Unauthorized", 401);

    await assertCanAddClient(user.id);

    const name = requireString(body.name, "name", MAX_NAME);
    const email = requireEmail(body.email, "email");
    const phone = optionalString(body.phone, "phone", MAX_PHONE) ?? null;
    const notes = optionalString(body.notes, "notes", MAX_NOTES);

    const created = await db
      .insert(clients)
      .values({
        name,
        email,
        phone,
        status: "active",
        notes,
        userId: user.id,
      })
      .returning();

    return created[0];
  } catch (error) {
    if (error instanceof ValidationError) {
      return { message: error.message };
    }
    console.error(error);
    return { message: "Server error" };
  }
}

export async function updateExistingClient(newClient: UpdateClientInput) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const { id, name, email, phone, notes, status } = newClient;

  const updateData: Partial<UpdateClientInput> = {};
  if (name !== undefined && name !== null && name !== "") {
    updateData.name = requireString(name, "name", MAX_NAME);
  }
  if (email !== undefined && email !== null && email !== "") {
    updateData.email = requireEmail(email, "email");
  }
  if (phone !== undefined && phone !== null && phone !== "") {
    updateData.phone = requireString(phone, "phone", MAX_PHONE);
  }
  if (notes !== undefined && notes !== null && notes !== "") {
    updateData.notes = requireString(notes, "notes", MAX_NOTES);
  }
  if (status !== undefined && status !== null) {
    updateData.status = requireOneOf(status, "status", CLIENT_STATUSES);
  }

  if (Object.keys(updateData).length === 0) return;

  await db
    .update(clients)
    .set(updateData)
    .where(and(eq(clients.userId, user.id), eq(clients.id, id)));
}

export async function deleteClient({ id }: { id: number }) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  await db
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
}

export async function updateNotes({
  id,
  notes,
}: {
  id: number;
  notes: string;
}) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const validNotes = requireString(notes, "notes", MAX_NOTES, {
    allowEmpty: true,
  });
  await db
    .update(clients)
    .set({ notes: validNotes })
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
}

