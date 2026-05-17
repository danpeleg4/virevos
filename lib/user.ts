"use server";

import { getCurrentUser } from "./supabase/auth";
import { db } from "@db/db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export async function changeRecordingStatus() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  try {
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.user_id, user.id));
    const recordingStatus = userData.recordingStatus;
    await db
      .update(users)
      .set({
        recordingStatus: !recordingStatus,
      })
      .where(eq(users.user_id, user.id));
  } catch (err) {
    console.error(err);
  }
}

export async function ensureUserRow() {
  const user = await getCurrentUser();
  if (!user?.id) return;

  const email = user.email ?? "";
  const name = (user.user_metadata?.name as string | undefined) ?? "";

  await db
    .insert(users)
    .values({ user_id: user.id, email, name })
    .onConflictDoNothing({ target: users.user_id });
}
