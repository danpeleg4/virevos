"use server";

import { db } from "@db/db";
import { outlookEmails, outlookTokens } from "@db/schema";
import { getCurrentUser } from "@/lib/supabase/auth";
import { eq } from "drizzle-orm";
import { removeSubscriptions } from "@/lib/outlook/outlook_sync";
import { ValidationError } from "./util/validation";

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
