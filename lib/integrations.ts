"use server";

import { db } from "@db/db";
import {
  googleEmails,
  googleTokens,
  outlookEmails,
  outlookTokens,
} from "@db/schema";
import { getCurrentUser } from "@/lib/supabase/auth";
import { eq } from "drizzle-orm";
import { stopWatchChannel } from "@/lib/google/google_sync";
import { removeSubscriptions } from "@/lib/outlook/outlook_sync";
import { ValidationError } from "./util/validation";

export async function disconnectGoogle() {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  try {
    await stopWatchChannel(user.id);
  } catch (err) {
    console.error("[integrations] stopWatchChannel failed:", err);
  }

  await db.delete(googleTokens).where(eq(googleTokens.userId, user.id));
  await db.delete(googleEmails).where(eq(googleEmails.userId, user.id));

  return { success: true };
}

export async function getGoogleConnectionStatus(): Promise<{
  connected: boolean;
}> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const rows = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, user.id))
    .limit(1);

  return { connected: rows.length > 0 && rows[0].connected === true };
}

export async function disconnectOutlook() {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  try {
    await removeSubscriptions(user.id);
  } catch (err) {
    console.error("[integrations] removeSubscriptions failed:", err);
  }

  await db.delete(outlookTokens).where(eq(outlookTokens.userId, user.id));
  await db.delete(outlookEmails).where(eq(outlookEmails.userId, user.id));

  return { success: true };
}

export async function getOutlookConnectionStatus(): Promise<{
  connected: boolean;
}> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const rows = await db
    .select()
    .from(outlookTokens)
    .where(eq(outlookTokens.userId, user.id))
    .limit(1);

  return { connected: rows.length > 0 && rows[0].connected === true };
}
