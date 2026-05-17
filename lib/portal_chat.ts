"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { clientPortalTokens, portalMessages } from "@db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  MAX_MESSAGE,
  ValidationError,
  requireInt,
  requireOneOf,
  requireString,
} from "./util/validation";

const PORTAL_CHAT_ACTIONS = [
  "star",
  "unstar",
  "archive",
  "unarchive",
  "markUnread",
] as const;

async function loadPortalForUser(clientId: number, userId: string) {
  const rows = await db
    .select()
    .from(clientPortalTokens)
    .where(
      and(
        eq(clientPortalTokens.clientId, clientId),
        eq(clientPortalTokens.userId, userId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function sendAgencyChatMessage(clientId: number, message: string) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericClientId = requireInt(clientId, "clientId");
  const body = requireString(message, "message", MAX_MESSAGE);

  const portal = await loadPortalForUser(numericClientId, user.id);
  if (!portal) throw new ValidationError("Portal not found", 404);

  const [inserted] = await db
    .insert(portalMessages)
    .values({
      portalId: portal.id,
      clientId: portal.clientId,
      userId: portal.userId,
      senderType: "agency",
      body,
    })
    .returning({
      id: portalMessages.id,
      senderType: portalMessages.senderType,
      body: portalMessages.body,
      readAt: portalMessages.readAt,
      createdAt: portalMessages.createdAt,
    });

  return {
    id: inserted.id,
    senderType: inserted.senderType,
    body: inserted.body,
    readAt: inserted.readAt ? inserted.readAt.toISOString() : null,
    createdAt: inserted.createdAt.toISOString(),
  };
}

export async function updatePortalChat(clientId: number, action: string) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericClientId = requireInt(clientId, "clientId");
  const validAction = requireOneOf(action, "action", PORTAL_CHAT_ACTIONS);

  const portal = await loadPortalForUser(numericClientId, user.id);
  if (!portal) throw new ValidationError("Portal not found", 404);

  if (validAction === "star" || validAction === "unstar") {
    await db
      .update(clientPortalTokens)
      .set({ chatStarred: validAction === "star" })
      .where(eq(clientPortalTokens.id, portal.id));
  } else if (validAction === "archive" || validAction === "unarchive") {
    await db
      .update(clientPortalTokens)
      .set({ chatArchived: validAction === "archive" })
      .where(eq(clientPortalTokens.id, portal.id));
  } else if (validAction === "markUnread") {
    const latestClientMsg = await db
      .select({ id: portalMessages.id })
      .from(portalMessages)
      .where(
        and(
          eq(portalMessages.portalId, portal.id),
          eq(portalMessages.senderType, "client")
        )
      )
      .orderBy(desc(portalMessages.createdAt))
      .limit(1);

    if (latestClientMsg.length > 0) {
      await db
        .update(portalMessages)
        .set({ readAt: null })
        .where(eq(portalMessages.id, latestClientMsg[0].id));
    }
  }

  return { success: true };
}

export async function deletePortalChat(clientId: number) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericClientId = requireInt(clientId, "clientId");

  const portal = await loadPortalForUser(numericClientId, user.id);
  if (!portal) throw new ValidationError("Portal not found", 404);

  await db.delete(portalMessages).where(eq(portalMessages.portalId, portal.id));

  await db
    .update(clientPortalTokens)
    .set({ chatStarred: false, chatArchived: false })
    .where(eq(clientPortalTokens.id, portal.id));

  return { success: true };
}
