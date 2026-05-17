"use server";

import { db } from "@db/db";
import { googleEmails, emailAttachments, clients } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { gmail_v1 } from "googleapis";
import {
  getGmailClient,
  parseEmailBody,
  parseEmailAddress,
  getHeader,
  parseHeaderValue,
  listAttachments,
} from "./gmail_client";
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMessageWithRetry(
  gmail: NonNullable<Awaited<ReturnType<typeof getGmailClient>>>,
  messageId: string,
  retries = 3
): Promise<gmail_v1.Schema$Message> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      return res.data;
    } catch (err: unknown) {
      const e = err as { code?: number; status?: number };
      if (e?.code === 429 || e?.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[gmail_sync] Rate limited, retrying after ${delay}ms`);
        await sleep(delay);
      } else {
        throw err as Error;
      }
    }
  }
  throw new Error(
    `Failed to fetch message ${messageId} after ${retries} retries`
  );
}

async function processMessage(
  gmail: NonNullable<Awaited<ReturnType<typeof getGmailClient>>>,
  messageId: string,
  userId: string,
  clientsMap: Map<string, number>
): Promise<void> {
  const msg = await fetchMessageWithRetry(gmail, messageId);
  if (!msg) return;

  const headers = (msg.payload?.headers ?? []) as Array<{
    name: string;
    value: string;
  }>;
  const fromRaw = parseHeaderValue(getHeader(headers, "From"));
  const toRaw = parseHeaderValue(getHeader(headers, "To"));
  const ccRaw = parseHeaderValue(getHeader(headers, "CC"));
  const subjectRaw = parseHeaderValue(getHeader(headers, "Subject"));
  const dateRaw = getHeader(headers, "Date");

  const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);

  const toEmails = toRaw
    ? toRaw
        .split(",")
        .map((e) => parseEmailAddress(e.trim()).email)
        .filter(Boolean)
    : [];
  const ccEmails = ccRaw
    ? ccRaw
        .split(",")
        .map((e) => parseEmailAddress(e.trim()).email)
        .filter(Boolean)
    : [];

  const sentAt = dateRaw ? new Date(dateRaw) : new Date();

  const { html: bodyHtml, text: bodyText } = parseEmailBody(
    (msg.payload ?? {}) as import("@/types/gmail").GmailMessagePart
  );

  const labelIds: string[] = msg.labelIds ?? [];
  const isRead = !labelIds.includes("UNREAD");
  const isStarred = labelIds.includes("STARRED");
  const isArchived = !labelIds.includes("INBOX") && !labelIds.includes("SENT");
  const isSent = labelIds.includes("SENT");

  // Try to match client by email
  let clientId: number | null = null;
  const emailToMatch = isSent ? toEmails[0] : fromEmail;
  if (emailToMatch) {
    clientId = clientsMap.get(emailToMatch.toLowerCase()) ?? null;
  }

  const emailData = {
    gmailId: msg.id!,
    threadId: msg.threadId!,
    subject: subjectRaw || "(no subject)",
    snippet: msg.snippet ?? null,
    fromEmail: fromEmail || null,
    fromName: fromName || null,
    toEmails,
    ccEmails,
    bodyHtml: bodyHtml ?? null,
    bodyText: bodyText ?? null,
    labelIds,
    isRead,
    isStarred,
    isArchived,
    isSent,
    sentAt,
    clientId,
    userId,
  };

  // Upsert: check for existing record
  const existing = await db
    .select({ id: googleEmails.id })
    .from(googleEmails)
    .where(
      and(eq(googleEmails.gmailId, msg.id!), eq(googleEmails.userId, userId))
    )
    .limit(1);

  let emailId: number;

  if (existing.length > 0) {
    await db
      .update(googleEmails)
      .set({
        isRead,
        isStarred,
        labelIds,
        isArchived,
        snippet: msg.snippet ?? null,
        clientId,
      })
      .where(eq(googleEmails.id, existing[0].id));
    emailId = existing[0].id;
  } else {
    const [inserted] = await db
      .insert(googleEmails)
      .values(emailData)
      .returning({ id: googleEmails.id });
    emailId = inserted.id;

    // Save attachment metadata for new emails
    const attachmentMeta = listAttachments(
      (msg.payload ?? {}) as import("@/types/gmail").GmailMessagePart
    );
    if (attachmentMeta.length > 0) {
      await db.insert(emailAttachments).values(
        attachmentMeta.map((att) => ({
          emailId,
          filename: att.filename,
          mimeType: att.mimeType ?? null,
          size: att.size ?? null,
          gmailAttachmentId: att.attachmentId,
          userId,
        }))
      );
    }
  }
}

export async function performGmailSync(
  userId: string
): Promise<{ synced: number; errors: number }> {
  const gmail = await getGmailClient(userId);
  if (!gmail) {
    console.warn(`[gmail_sync] No Gmail client for user ${userId}`);
    return { synced: 0, errors: 0 };
  }

  // Build a map of client emails → clientId for quick lookup
  const userClients = await db
    .select({ id: clients.id, email: clients.email })
    .from(clients)
    .where(eq(clients.userId, userId));

  const clientsMap = new Map<string, number>();
  for (const c of userClients) {
    if (c.email) {
      clientsMap.set(c.email.toLowerCase(), c.id);
    }
  }

  let synced = 0;
  let errors = 0;

  const labels = ["INBOX", "SENT"];

  for (const label of labels) {
    let pageToken: string | undefined;
    let fetched = 0;

    do {
      const listRes = await gmail.users.messages.list({
        userId: "me",
        labelIds: [label],
        maxResults: 100,
        pageToken,
      });

      const messageIds = listRes.data.messages ?? [];
      pageToken = listRes.data.nextPageToken ?? undefined;

      for (const msgRef of messageIds) {
        if (!msgRef.id) continue;
        if (fetched >= 200) break;
        fetched++;

        try {
          await processMessage(gmail, msgRef.id, userId, clientsMap);
          synced++;
        } catch (err) {
          console.error(
            `[gmail_sync] Error processing message ${msgRef.id}:`,
            err
          );
          errors++;
        }
      }

      if (fetched >= 200) break;
    } while (pageToken);
  }

  return { synced, errors };
}

export async function syncSingleMessage(
  userId: string,
  gmailId: string
): Promise<void> {
  const gmail = await getGmailClient(userId);
  if (!gmail) return;

  const userClients = await db
    .select({ id: clients.id, email: clients.email })
    .from(clients)
    .where(eq(clients.userId, userId));

  const clientsMap = new Map<string, number>();
  for (const c of userClients) {
    if (c.email) {
      clientsMap.set(c.email.toLowerCase(), c.id);
    }
  }

  await processMessage(gmail, gmailId, userId, clientsMap);
}
