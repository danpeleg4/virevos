import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { PortalChatDB } from "@db/portal_chat_db";
import type { PortalChatMessage } from "@/types/portal";
import {
  MAX_MESSAGE,
  MAX_SHORT,
  ValidationError,
  requireInt,
  requireOneOf,
  requireString,
} from "../util/validation";
import { rateLimitHeaders } from "../util/rate_limit";

const PORTAL_CHAT_ACTIONS = [
  "star",
  "unstar",
  "archive",
  "unarchive",
  "markUnread",
] as const;

/**
 * Public, token-authenticated action used by the client portal to post a chat
 * message. Enforces a per-IP rate limit and returns the inserted message.
 */
export async function sendPortalChatMessage(
  token: string,
  message: string,
  portalChatDb: PortalChatDB
): Promise<PortalChatMessage> {
  const limited = rateLimitHeaders(await headers(), {
    keyPrefix: "portal-chat",
    windowMs: 60_000,
    max: 30,
  });
  if (limited) throw new ValidationError("Too many requests", 429);
  if (!token) throw new ValidationError("Missing token", 400);

  const tokenValue = requireString(token, "token", MAX_SHORT);
  const body = requireString(message, "message", MAX_MESSAGE);

  const rows = await portalChatDb.getPortalByToken(tokenValue);
  const portal = rows[0];
  if (!portal || !portal.enabled) {
    throw new ValidationError("Portal not found or disabled", 404);
  }

  const inserted = await portalChatDb.insertMessage({
    portalId: portal.id,
    clientId: portal.clientId,
    userId: portal.userId,
    senderType: "client",
    body,
  });

  return {
    id: inserted.id,
    senderType: inserted.senderType as PortalChatMessage["senderType"],
    body: inserted.body,
    readAt: inserted.readAt ? inserted.readAt.toISOString() : null,
    createdAt: inserted.createdAt!.toISOString(),
  };
}

export interface PortalChatThread {
  portalId: number;
  messages: PortalChatMessage[];
}

export async function getPortalChatThread(
  clientId: number,
  portalChatDb: PortalChatDB
): Promise<PortalChatThread> {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const numericClientId = requireInt(clientId, "clientId");

  const rows = await portalChatDb.getPortalForUser(numericClientId, user.id);
  const portal = rows[0];
  if (!portal) throw new ValidationError("Portal not found", 404);

  const rowsForPortal = await portalChatDb.getMessagesForPortal(portal.id);
  await portalChatDb.markClientMessagesRead(portal.id);

  return {
    portalId: portal.id,
    messages: rowsForPortal.map((r) => ({
      id: r.id,
      senderType: r.senderType as PortalChatMessage["senderType"],
      body: r.body,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt!.toISOString(),
    })),
  };
}

export interface PortalChatMessagesResult {
  messages: PortalChatMessage[];
}

/** Public, token-authenticated read of a chat thread for the client portal. */
export async function getPortalChatMessages(
  token: string,
  portalChatDb: PortalChatDB
): Promise<PortalChatMessagesResult> {
  const tokenValue = requireString(token, "token", MAX_SHORT);

  const portalRows = await portalChatDb.getPortalByToken(tokenValue);
  const portal = portalRows[0];
  if (!portal || !portal.enabled) {
    throw new ValidationError("Portal not found", 404);
  }

  const rows = await portalChatDb.getMessagesForPortal(portal.id);
  await portalChatDb.markAgencyMessagesRead(portal.id);

  return {
    messages: rows.map((r) => ({
      id: r.id,
      senderType: r.senderType as PortalChatMessage["senderType"],
      body: r.body,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt!.toISOString(),
    })),
  };
}

export async function sendAgencyChatMessage(
  clientId: number,
  message: string,
  portalChatDb: PortalChatDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericClientId = requireInt(clientId, "clientId");
  const body = requireString(message, "message", MAX_MESSAGE);

  const rows = await portalChatDb.getPortalForUser(numericClientId, user.id);
  const portal = rows[0];
  if (!portal) throw new ValidationError("Portal not found", 404);

  const inserted = await portalChatDb.insertMessage({
    portalId: portal.id,
    clientId: portal.clientId,
    userId: portal.userId,
    senderType: "agency",
    body,
  });

  return {
    id: inserted.id,
    senderType: inserted.senderType as PortalChatMessage["senderType"],
    body: inserted.body,
    readAt: inserted.readAt ? inserted.readAt.toISOString() : null,
    createdAt: inserted.createdAt!.toISOString(),
  };
}

export async function updatePortalChat(
  clientId: number,
  action: string,
  portalChatDb: PortalChatDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericClientId = requireInt(clientId, "clientId");
  const validAction = requireOneOf(action, "action", PORTAL_CHAT_ACTIONS);

  const rows = await portalChatDb.getPortalForUser(numericClientId, user.id);
  const portal = rows[0];
  if (!portal) throw new ValidationError("Portal not found", 404);

  if (validAction === "star" || validAction === "unstar") {
    await portalChatDb.setChatStarred(portal.id, validAction === "star");
  } else if (validAction === "archive" || validAction === "unarchive") {
    await portalChatDb.setChatArchived(portal.id, validAction === "archive");
  } else if (validAction === "markUnread") {
    const latestClientMsg = await portalChatDb.getLatestClientMessage(
      portal.id
    );

    if (latestClientMsg.length > 0) {
      await portalChatDb.markMessageUnread(latestClientMsg[0].id);
    }
  }

  return { success: true };
}

export async function deletePortalChat(
  clientId: number,
  portalChatDb: PortalChatDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericClientId = requireInt(clientId, "clientId");

  const rows = await portalChatDb.getPortalForUser(numericClientId, user.id);
  const portal = rows[0];
  if (!portal) throw new ValidationError("Portal not found", 404);

  await portalChatDb.deleteMessages(portal.id);
  await portalChatDb.resetChatFlags(portal.id);

  return { success: true };
}
