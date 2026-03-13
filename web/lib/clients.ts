"use server";

import { CreateClientInput, UpdateClientInput } from "@/types/clients";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@db/db";
import { clients } from "@db/schema";
import { and, eq } from "drizzle-orm";

export async function addAClient(body: CreateClientInput) {
  try {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    const { name, email, phone, industry, notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { message: "Name & email required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    const created = await db
      .insert(clients)
      .values({
        name,
        email,
        phone: phone ? phone : null,
        industry: industry ? industry : null,
        status: "active",
        notes: notes,
        userId: user.id,
      })
      .returning();

    return created[0];
  } catch (error) {
    console.error(error);
    return { message: "Server error" };
  }
}

export async function updateExistingClient(newClient: UpdateClientInput) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");

  const { id, name, email, phone, industry, notes } = newClient;

  // Build update object dynamically
  const updateData: Partial<UpdateClientInput> = {};
  if (name !== undefined && name !== null && name !== "")
    updateData.name = name;
  if (email !== undefined && email !== null && email !== "")
    updateData.email = email;
  if (phone !== undefined && phone !== null && phone !== "")
    updateData.phone = phone;
  if (industry !== undefined && industry !== null && industry !== "")
    updateData.industry = industry;
  if (notes !== undefined && notes !== null && notes !== "")
    updateData.notes = notes;

  // Only run update if there's at least one field
  if (Object.keys(updateData).length === 0) return;

  await db
    .update(clients)
    .set(updateData)
    .where(and(eq(clients.userId, user.id), eq(clients.id, id)));
}

export async function deleteClient({ id }: { id: number }) {
  const user = await currentUser();
  if (!user?.id) throw new Error("No user");
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
  if (!user?.id) throw new Error("No user");
  await db
    .update(clients)
    .set({ notes: notes })
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));
}
