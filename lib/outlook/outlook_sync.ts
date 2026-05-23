import axios from "axios";
import { db } from "@db/db";
import { events, outlookEmails, outlookSyncState } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import {
  createEmbeddings,
  EMAILS_BUCKET,
  EMAILS_INDEX,
} from "@/lib/embeddings";
import { supabaseAdmin } from "@/lib/supabase/supabase";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const EVENT_SELECT =
  "id,subject,bodyPreview,start,end,isOnlineMeeting,onlineMeetingUrl,webLink,showAs,isCancelled";
const EMAIL_SELECT =
  "id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,isRead,hasAttachments,receivedDateTime,isDraft,flag";

// text-embedding-3-large accepts up to ~8k tokens. Conservative char cap.
const EMBED_MAX_CHARS = 20000;
const VECTOR_BATCH_SIZE = 100;

function buildEmbeddingInput(args: {
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
}): string | null {
  const body =
    args.bodyText ??
    (args.bodyHtml ? args.bodyHtml.replace(/<[^>]+>/g, " ") : null) ??
    args.snippet;
  const subject = args.subject?.trim();
  const bodyClean = body?.replace(/\s+/g, " ").trim();
  if (!subject && !bodyClean) return null;
  const combined = [subject, bodyClean].filter(Boolean).join("\n\n");
  return combined.slice(0, EMBED_MAX_CHARS);
}

async function indexEmailVectors(
  rows: Array<{
    outlookId: string;
    userId: string;
    conversationId: string;
    subject: string;
    fromEmail: string | null;
    sentAt: Date;
    isSent: boolean;
    input: string;
  }>
): Promise<void> {
  if (rows.length === 0) return;
  const index = supabaseAdmin.storage.vectors
    .from(EMAILS_BUCKET)
    .index(EMAILS_INDEX);

  for (let start = 0; start < rows.length; start += VECTOR_BATCH_SIZE) {
    const chunk = rows.slice(start, start + VECTOR_BATCH_SIZE);
    try {
      const embeddings = await createEmbeddings(chunk.map((r) => r.input));
      await index.putVectors({
        vectors: chunk.map((r, i) => ({
          key: `${r.userId}/${r.outlookId}`,
          data: { float32: embeddings[i] },
          metadata: {
            user_id: r.userId,
            outlook_id: r.outlookId,
            conversation_id: r.conversationId,
            subject: r.subject,
            from_email: r.fromEmail,
            sent_at: r.sentAt.toISOString(),
            is_sent: r.isSent,
          },
        })),
      });
    } catch (err) {
      console.error(
        "[outlook_sync] Failed to index email batch into vector bucket:",
        err
      );
    }
  }
}

interface GraphEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  webLink?: string;
  showAs?: string;
  isCancelled?: boolean;
  "@removed"?: { reason: string };
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  from?: { emailAddress: { address: string; name: string } };
  toRecipients?: Array<{ emailAddress: { address: string; name: string } }>;
  ccRecipients?: Array<{ emailAddress: { address: string; name: string } }>;
  body?: { contentType: string; content: string };
  isRead?: boolean;
  hasAttachments?: boolean;
  receivedDateTime?: string;
  isDraft?: boolean;
  flag?: { flagStatus: string };
  parentFolderId?: string;
  "@removed"?: { reason: string };
}

interface GraphDeltaResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

async function graphGet<T>(
  token: string,
  url: string
): Promise<GraphDeltaResponse<T>> {
  try {
    const response = await axios.get<GraphDeltaResponse<T>>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(
        "[graphGet] status:",
        err.response?.status,
        "body:",
        JSON.stringify(err.response?.data)
      );
      console.error("[graphGet] url:", url);
    }
    throw err;
  }
}

async function fetchAllPages<T>(
  token: string,
  initialUrl: string
): Promise<{ items: T[]; deltaLink?: string }> {
  const items: T[] = [];
  let nextUrl: string | undefined = initialUrl;
  let deltaLink: string | undefined;

  while (nextUrl) {
    const data: GraphDeltaResponse<T> = await graphGet<T>(token, nextUrl);
    items.push(...data.value);
    nextUrl = data["@odata.nextLink"];
    if (!nextUrl) {
      deltaLink = data["@odata.deltaLink"];
    }
  }

  return { items, deltaLink };
}

export function parseGraphDateTime(dt: {
  dateTime: string;
  timeZone: string;
}): Date {
  // Graph returns dateTime without a timezone designator and defaults to UTC
  // (we don't send Prefer: outlook.timezone). Append "Z" so JS parses as UTC,
  // not local time.
  return new Date(`${dt.dateTime}Z`);
}

async function applyOutlookEventsToDb(
  graphEvents: GraphEvent[],
  userId: string,
  isFullSync: boolean
): Promise<void> {
  const existingEvents = await db
    .select()
    .from(events)
    .where(eq(events.userId, userId));

  const existingMap = new Map(
    existingEvents.map((e) => [e.outlookEventId ?? e.id, e])
  );

  const toInsert = [];

  for (const e of graphEvents) {
    if (!e.id) continue;

    const isRemoved = !!e["@removed"] || e.isCancelled;

    if (isRemoved) {
      const existing = existingMap.get(e.id);
      if (existing) {
        await db.delete(events).where(eq(events.id, existing.id));
      } else {
        await db
          .delete(events)
          .where(
            and(eq(events.outlookEventId, e.id), eq(events.userId, userId))
          );
      }
      continue;
    }

    if (!e.start) continue;

    const start = parseGraphDateTime(e.start);
    const end = e.end ? parseGraphDateTime(e.end) : start;
    const durationMinutes = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    const title = e.subject ?? "Untitled";
    const description = e.bodyPreview ?? null;
    const status = e.showAs === "tentative" ? "tentative" : "confirmed";

    if (existingMap.has(e.id)) {
      const m = existingMap.get(e.id)!;
      const hasChanged =
        m.title !== title ||
        m.description !== description ||
        m.dateTime.getTime() !== start.getTime() ||
        m.duration !== durationMinutes ||
        m.status !== status;

      if (hasChanged) {
        await db
          .update(events)
          .set({
            title,
            description,
            dateTime: start,
            duration: durationMinutes,
            status,
          })
          .where(eq(events.id, m.id));
      }
      continue;
    }

    toInsert.push({
      id: e.id,
      outlookEventId: e.id,
      title,
      description,
      dateTime: start,
      duration: durationMinutes,
      origin: "outlook_calendar",
      status,
      userId,
    });
  }

  if (toInsert.length > 0) {
    await db.insert(events).values(toInsert);
  }

  // Full sync: remove events in our DB that weren't returned by Outlook
  if (isFullSync) {
    const returnedIds = new Set(graphEvents.map((e) => e.id));
    for (const m of existingEvents) {
      if (m.origin !== "outlook_calendar" || !m.outlookEventId) continue;
      if (!returnedIds.has(m.outlookEventId)) {
        await db.delete(events).where(eq(events.id, m.id));
      }
    }
  }
}

async function applyOutlookEmailsToDb(
  messages: GraphMessage[],
  userId: string,
  isSentFolder = false
): Promise<void> {
  const existingEmails = await db
    .select()
    .from(outlookEmails)
    .where(eq(outlookEmails.userId, userId));

  const existingMap = new Map(existingEmails.map((e) => [e.outlookId, e]));

  const toInsert = [];
  const toEmbed: Array<{
    outlookId: string;
    userId: string;
    conversationId: string;
    subject: string;
    fromEmail: string | null;
    sentAt: Date;
    isSent: boolean;
    input: string;
  }> = [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const isRemoved = !!msg["@removed"];

    if (isRemoved) {
      const existing = existingMap.get(msg.id);
      if (existing) {
        await db.delete(outlookEmails).where(eq(outlookEmails.id, existing.id));
      }
      continue;
    }

    if (msg.isDraft) continue;
    if (!msg.receivedDateTime) continue;

    const fromEmail = msg.from?.emailAddress.address ?? null;
    const fromName = msg.from?.emailAddress.name ?? null;
    const toEmails = (msg.toRecipients ?? []).map(
      (r) => r.emailAddress.address
    );
    const ccEmails = (msg.ccRecipients ?? []).map(
      (r) => r.emailAddress.address
    );
    const bodyHtml = msg.body?.contentType === "html" ? msg.body.content : null;
    const bodyText = msg.body?.contentType === "text" ? msg.body.content : null;
    const isRead = msg.isRead ?? false;
    const isStarred = msg.flag?.flagStatus === "flagged";
    const hasAttachments = msg.hasAttachments ?? false;
    const sentAt = new Date(msg.receivedDateTime);

    if (existingMap.has(msg.id)) {
      const existing = existingMap.get(msg.id)!;
      const hasChanged =
        existing.isRead !== isRead || existing.isStarred !== isStarred;
      if (hasChanged) {
        await db
          .update(outlookEmails)
          .set({ isRead, isStarred })
          .where(eq(outlookEmails.id, existing.id));
      }
      continue;
    }

    const subject = msg.subject ?? "(no subject)";
    const conversationId = msg.conversationId ?? msg.id;
    const snippet = msg.bodyPreview ?? null;

    toInsert.push({
      outlookId: msg.id,
      conversationId,
      subject,
      snippet,
      fromEmail,
      fromName,
      toEmails,
      ccEmails,
      bodyHtml,
      bodyText,
      isRead,
      isStarred,
      isArchived: false,
      isSent: isSentFolder,
      hasAttachments,
      sentAt,
      userId,
    });

    const input = buildEmbeddingInput({
      subject,
      bodyText,
      bodyHtml,
      snippet,
    });
    if (input) {
      toEmbed.push({
        outlookId: msg.id,
        userId,
        conversationId,
        subject,
        fromEmail,
        sentAt,
        isSent: isSentFolder,
        input,
      });
    }
  }

  if (toInsert.length > 0) {
    await db.insert(outlookEmails).values(toInsert);
  }

  await indexEmailVectors(toEmbed);
}

export async function performFullSync(userId: string): Promise<void> {
  const token = await getFreshOutlookAccessToken(userId);
  if (!token) throw new Error(`No Outlook token for user ${userId}`);

  // Sync calendar events (last 30 days to +6 months window)
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6);

  const calendarUrl = `${GRAPH_BASE}/me/calendarView/delta?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}&$select=${EVENT_SELECT}`;
  const { items: calendarEvents, deltaLink: calendarDeltaLink } =
    await fetchAllPages<GraphEvent>(token, calendarUrl);

  await applyOutlookEventsToDb(calendarEvents, userId, true);

  // Sync inbox emails (last 60 days) via folder-specific delta
  const inboxUrl = `${GRAPH_BASE}/me/mailFolders/inbox/messages/delta?$select=${EMAIL_SELECT}&$top=100`;
  const cutoff = new Date(Date.now() - 60 * 24 * 3600 * 1000);
  const { items: allInboxMessages, deltaLink: emailDeltaLink } =
    await fetchAllPages<GraphMessage>(token, inboxUrl);
  const inboxMessages = allInboxMessages.filter(
    (m) => !m.receivedDateTime || new Date(m.receivedDateTime) >= cutoff
  );
  await applyOutlookEmailsToDb(inboxMessages, userId, false);

  // Sync sent items
  const sentUrl = `${GRAPH_BASE}/me/mailFolders/sentitems/messages/delta?$select=${EMAIL_SELECT}&$top=100`;
  const { items: allSentMessages, deltaLink: sentEmailDeltaLink } =
    await fetchAllPages<GraphMessage>(token, sentUrl);
  const sentMessages = allSentMessages.filter(
    (m) => !m.receivedDateTime || new Date(m.receivedDateTime) >= cutoff
  );
  await applyOutlookEmailsToDb(sentMessages, userId, true);

  await db
    .insert(outlookSyncState)
    .values({
      userId,
      calendarDeltaLink: calendarDeltaLink ?? null,
      emailDeltaLink: emailDeltaLink ?? null,
      sentEmailDeltaLink: sentEmailDeltaLink ?? null,
    })
    .onConflictDoUpdate({
      target: outlookSyncState.userId,
      set: {
        calendarDeltaLink: calendarDeltaLink ?? null,
        emailDeltaLink: emailDeltaLink ?? null,
        sentEmailDeltaLink: sentEmailDeltaLink ?? null,
      },
    });
}

export async function performIncrementalSync(userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(outlookSyncState)
    .where(eq(outlookSyncState.userId, userId))
    .limit(1);

  if (
    !rows.length ||
    (!rows[0].calendarDeltaLink &&
      !rows[0].emailDeltaLink &&
      !rows[0].sentEmailDeltaLink)
  ) {
    await performFullSync(userId);
    return;
  }

  const token = await getFreshOutlookAccessToken(userId);
  if (!token) throw new Error(`No Outlook token for user ${userId}`);

  const { calendarDeltaLink, emailDeltaLink, sentEmailDeltaLink } = rows[0];
  let newCalendarDeltaLink = calendarDeltaLink;
  let newEmailDeltaLink = emailDeltaLink;
  let newSentEmailDeltaLink = sentEmailDeltaLink;

  if (calendarDeltaLink) {
    try {
      const { items, deltaLink } = await fetchAllPages<GraphEvent>(
        token,
        calendarDeltaLink
      );
      await applyOutlookEventsToDb(items, userId, false);
      newCalendarDeltaLink = deltaLink ?? calendarDeltaLink;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 410) {
        await performFullSync(userId);
        return;
      }
      throw err;
    }
  }

  if (emailDeltaLink) {
    try {
      const { items, deltaLink } = await fetchAllPages<GraphMessage>(
        token,
        emailDeltaLink
      );
      await applyOutlookEmailsToDb(items, userId, false);
      newEmailDeltaLink = deltaLink ?? emailDeltaLink;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 410) {
        newEmailDeltaLink = null;
      } else {
        throw err;
      }
    }
  }

  if (sentEmailDeltaLink) {
    try {
      const { items, deltaLink } = await fetchAllPages<GraphMessage>(
        token,
        sentEmailDeltaLink
      );
      await applyOutlookEmailsToDb(items, userId, true);
      newSentEmailDeltaLink = deltaLink ?? sentEmailDeltaLink;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 410) {
        newSentEmailDeltaLink = null;
      } else {
        throw err;
      }
    }
  }

  await db
    .update(outlookSyncState)
    .set({
      calendarDeltaLink: newCalendarDeltaLink,
      emailDeltaLink: newEmailDeltaLink,
      sentEmailDeltaLink: newSentEmailDeltaLink,
    })
    .where(eq(outlookSyncState.userId, userId));
}

export async function setupSubscriptions(userId: string): Promise<void> {
  const token = await getFreshOutlookAccessToken(userId);
  if (!token) throw new Error(`No Outlook token for user ${userId}`);

  const env =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL
      : process.env.NEXT_PUBLIC_APP_URL_NGROK;

  const notificationUrl = `${env}/api/webhooks/outlook`;
  const clientState = crypto.randomUUID();

  // Subscriptions expire in max ~4230 minutes (~3 days) for delegated calendar
  const expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  let calendarSubscriptionId: string | null = null;
  let emailSubscriptionId: string | null = null;

  try {
    const calRes = await axios.post<{ id: string; expirationDateTime: string }>(
      `${GRAPH_BASE}/subscriptions`,
      {
        changeType: "created,updated,deleted",
        notificationUrl,
        resource: "/me/events",
        expirationDateTime: expiration.toISOString(),
        clientState,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    calendarSubscriptionId = calRes.data.id;
  } catch (err) {
    console.error("[outlook_sync] Calendar subscription setup failed:", err);
  }

  try {
    const mailRes = await axios.post<{ id: string }>(
      `${GRAPH_BASE}/subscriptions`,
      {
        changeType: "created,updated,deleted",
        notificationUrl,
        resource: "/me/messages",
        expirationDateTime: expiration.toISOString(),
        clientState,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    emailSubscriptionId = mailRes.data.id;
  } catch (err) {
    console.error("[outlook_sync] Email subscription setup failed:", err);
  }

  await db
    .insert(outlookSyncState)
    .values({
      userId,
      calendarSubscriptionId,
      emailSubscriptionId,
      clientState,
      subscriptionExpiration: expiration.getTime(),
    })
    .onConflictDoUpdate({
      target: outlookSyncState.userId,
      set: {
        calendarSubscriptionId,
        emailSubscriptionId,
        clientState,
        subscriptionExpiration: expiration.getTime(),
      },
    });
}

export async function renewSubscriptions(userId: string): Promise<void> {
  const token = await getFreshOutlookAccessToken(userId);
  if (!token) return;

  const rows = await db
    .select()
    .from(outlookSyncState)
    .where(eq(outlookSyncState.userId, userId))
    .limit(1);

  if (!rows.length) return;

  const { calendarSubscriptionId, emailSubscriptionId } = rows[0];
  const newExpiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  let anyFailed = false;

  for (const subId of [calendarSubscriptionId, emailSubscriptionId]) {
    if (!subId) continue;
    try {
      await axios.patch(
        `${GRAPH_BASE}/subscriptions/${subId}`,
        { expirationDateTime: newExpiration.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error(
        `[outlook_sync] Failed to renew subscription ${subId}:`,
        err
      );
      anyFailed = true;
    }
  }

  if (anyFailed) {
    await setupSubscriptions(userId);
    return;
  }

  await db
    .update(outlookSyncState)
    .set({ subscriptionExpiration: newExpiration.getTime() })
    .where(eq(outlookSyncState.userId, userId));
}

export async function removeSubscriptions(userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(outlookSyncState)
    .where(eq(outlookSyncState.userId, userId))
    .limit(1);

  if (!rows.length) return;

  const { calendarSubscriptionId, emailSubscriptionId } = rows[0];

  const token = await getFreshOutlookAccessToken(userId);

  if (token) {
    for (const subId of [calendarSubscriptionId, emailSubscriptionId]) {
      if (!subId) continue;
      try {
        await axios.delete(`${GRAPH_BASE}/subscriptions/${subId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(
          `[outlook_sync] Failed to delete subscription ${subId}:`,
          err
        );
      }
    }
  }

  await db.delete(outlookSyncState).where(eq(outlookSyncState.userId, userId));
}
