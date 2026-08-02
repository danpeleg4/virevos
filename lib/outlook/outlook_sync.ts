import type { OutlookDB, NewOutlookEmailRow } from "@db/classes/outlook_db";
import type { CalendarDB, NewEventRow } from "@db/classes/calendar_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import type {
  GraphDeltaResponse,
  GraphMailServiceInterface,
} from "@/api_client/ms_graph/graph_mail_service";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import type { OpenAIClientInterface } from "@/api_client/openai_client";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import {
  createEmbeddings,
  EMAILS_BUCKET,
  EMAILS_INDEX,
} from "@/lib/embeddings";

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
  }>,
  storage: StorageClientInterface,
  openaiClient: OpenAIClientInterface
): Promise<void> {
  if (rows.length === 0) return;

  for (let start = 0; start < rows.length; start += VECTOR_BATCH_SIZE) {
    const chunk = rows.slice(start, start + VECTOR_BATCH_SIZE);
    try {
      const embeddings = await createEmbeddings(
        chunk.map((r) => r.input),
        openaiClient
      );
      await storage.putVectors(
        EMAILS_BUCKET,
        EMAILS_INDEX,
        chunk.map((r, i) => ({
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
        }))
      );
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

async function fetchAllPages<T>(
  graphMailService: GraphMailServiceInterface,
  token: string,
  initialUrl: string
): Promise<{ items: T[]; deltaLink?: string }> {
  const items: T[] = [];
  let nextUrl: string | undefined = initialUrl;
  let deltaLink: string | undefined;

  while (nextUrl) {
    const data: GraphDeltaResponse<T> = await graphMailService.fetchDelta<T>(
      token,
      nextUrl
    );
    items.push(...data.value);
    nextUrl = data["@odata.nextLink"];
    if (!nextUrl) {
      deltaLink = data["@odata.deltaLink"];
    }
  }

  return { items, deltaLink };
}

function axiosStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
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
  isFullSync: boolean,
  calendarDb: CalendarDB
): Promise<void> {
  const existingEvents = await calendarDb.getEventsForUser(userId);

  const existingMap = new Map(
    existingEvents.map((e) => [e.outlookEventId ?? e.id, e])
  );

  const toInsert: NewEventRow[] = [];

  for (const e of graphEvents) {
    if (!e.id) continue;

    const isRemoved = !!e["@removed"] || e.isCancelled;

    if (isRemoved) {
      const existing = existingMap.get(e.id);
      if (existing) {
        await calendarDb.deleteEvent(existing.id, userId);
      } else {
        await calendarDb.deleteEventByOutlookEventId(e.id, userId);
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
        await calendarDb.updateEvent(m.id, userId, {
          title,
          description,
          dateTime: start,
          duration: durationMinutes,
          status,
        });
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
    await calendarDb.insertEvents(toInsert);
  }

  // Full sync: remove events in our DB that weren't returned by Outlook
  if (isFullSync) {
    const returnedIds = new Set(graphEvents.map((e) => e.id));
    for (const m of existingEvents) {
      if (m.origin !== "outlook_calendar" || !m.outlookEventId) continue;
      if (!returnedIds.has(m.outlookEventId)) {
        await calendarDb.deleteEvent(m.id, userId);
      }
    }
  }
}

async function applyOutlookEmailsToDb(
  messages: GraphMessage[],
  userId: string,
  isSentFolder: boolean,
  outlookDb: OutlookDB,
  storage: StorageClientInterface,
  openaiClient: OpenAIClientInterface
): Promise<void> {
  const existingEmails = await outlookDb.getExistingEmailsForUser(userId);

  const existingMap = new Map(existingEmails.map((e) => [e.outlookId, e]));

  const toInsert: NewOutlookEmailRow[] = [];
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
        await outlookDb.deleteEmail(existing.id);
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
        await outlookDb.updateEmail(existing.id, { isRead, isStarred });
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
    await outlookDb.insertEmails(toInsert);
  }

  await indexEmailVectors(toEmbed, storage, openaiClient);
}

export async function performFullSync(
  userId: string,
  outlookDb: OutlookDB,
  calendarDb: CalendarDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface,
  storage: StorageClientInterface,
  openaiClient: OpenAIClientInterface
): Promise<void> {
  const token = await getFreshOutlookAccessToken(
    userId,
    outlookDb,
    graphAuthService
  );
  if (!token) throw new Error(`No Outlook token for user ${userId}`);

  // Sync calendar events (last 30 days to +6 months window)
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 30);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6);

  const calendarUrl = `${GRAPH_BASE}/me/calendarView/delta?startDateTime=${timeMin.toISOString()}&endDateTime=${timeMax.toISOString()}&$select=${EVENT_SELECT}`;
  const { items: calendarEvents, deltaLink: calendarDeltaLink } =
    await fetchAllPages<GraphEvent>(graphMailService, token, calendarUrl);

  await applyOutlookEventsToDb(calendarEvents, userId, true, calendarDb);

  // Sync inbox emails (last 60 days) via folder-specific delta
  const inboxUrl = `${GRAPH_BASE}/me/mailFolders/inbox/messages/delta?$select=${EMAIL_SELECT}&$top=100`;
  const cutoff = new Date(Date.now() - 60 * 24 * 3600 * 1000);
  const { items: allInboxMessages, deltaLink: emailDeltaLink } =
    await fetchAllPages<GraphMessage>(graphMailService, token, inboxUrl);
  const inboxMessages = allInboxMessages.filter(
    (m) => !m.receivedDateTime || new Date(m.receivedDateTime) >= cutoff
  );
  await applyOutlookEmailsToDb(
    inboxMessages,
    userId,
    false,
    outlookDb,
    storage,
    openaiClient
  );

  // Sync sent items
  const sentUrl = `${GRAPH_BASE}/me/mailFolders/sentitems/messages/delta?$select=${EMAIL_SELECT}&$top=100`;
  const { items: allSentMessages, deltaLink: sentEmailDeltaLink } =
    await fetchAllPages<GraphMessage>(graphMailService, token, sentUrl);
  const sentMessages = allSentMessages.filter(
    (m) => !m.receivedDateTime || new Date(m.receivedDateTime) >= cutoff
  );
  await applyOutlookEmailsToDb(
    sentMessages,
    userId,
    true,
    outlookDb,
    storage,
    openaiClient
  );

  await outlookDb.upsertDeltaLinks(userId, {
    calendarDeltaLink: calendarDeltaLink ?? null,
    emailDeltaLink: emailDeltaLink ?? null,
    sentEmailDeltaLink: sentEmailDeltaLink ?? null,
  });
}

export async function performIncrementalSync(
  userId: string,
  outlookDb: OutlookDB,
  calendarDb: CalendarDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface,
  storage: StorageClientInterface,
  openaiClient: OpenAIClientInterface
): Promise<void> {
  const rows = await outlookDb.getSyncState(userId);

  if (
    !rows.length ||
    (!rows[0].calendarDeltaLink &&
      !rows[0].emailDeltaLink &&
      !rows[0].sentEmailDeltaLink)
  ) {
    await performFullSync(
      userId,
      outlookDb,
      calendarDb,
      graphAuthService,
      graphMailService,
      storage,
      openaiClient
    );
    return;
  }

  const token = await getFreshOutlookAccessToken(
    userId,
    outlookDb,
    graphAuthService
  );
  if (!token) throw new Error(`No Outlook token for user ${userId}`);

  const { calendarDeltaLink, emailDeltaLink, sentEmailDeltaLink } = rows[0];
  let newCalendarDeltaLink = calendarDeltaLink;
  let newEmailDeltaLink = emailDeltaLink;
  let newSentEmailDeltaLink = sentEmailDeltaLink;

  if (calendarDeltaLink) {
    try {
      const { items, deltaLink } = await fetchAllPages<GraphEvent>(
        graphMailService,
        token,
        calendarDeltaLink
      );
      await applyOutlookEventsToDb(items, userId, false, calendarDb);
      newCalendarDeltaLink = deltaLink ?? calendarDeltaLink;
    } catch (err: unknown) {
      if (axiosStatus(err) === 410) {
        await performFullSync(
          userId,
          outlookDb,
          calendarDb,
          graphAuthService,
          graphMailService,
          storage,
          openaiClient
        );
        return;
      }
      throw err;
    }
  }

  if (emailDeltaLink) {
    try {
      const { items, deltaLink } = await fetchAllPages<GraphMessage>(
        graphMailService,
        token,
        emailDeltaLink
      );
      await applyOutlookEmailsToDb(
        items,
        userId,
        false,
        outlookDb,
        storage,
        openaiClient
      );
      newEmailDeltaLink = deltaLink ?? emailDeltaLink;
    } catch (err: unknown) {
      if (axiosStatus(err) === 410) {
        newEmailDeltaLink = null;
      } else {
        throw err;
      }
    }
  }

  if (sentEmailDeltaLink) {
    try {
      const { items, deltaLink } = await fetchAllPages<GraphMessage>(
        graphMailService,
        token,
        sentEmailDeltaLink
      );
      await applyOutlookEmailsToDb(
        items,
        userId,
        true,
        outlookDb,
        storage,
        openaiClient
      );
      newSentEmailDeltaLink = deltaLink ?? sentEmailDeltaLink;
    } catch (err: unknown) {
      if (axiosStatus(err) === 410) {
        newSentEmailDeltaLink = null;
      } else {
        throw err;
      }
    }
  }

  await outlookDb.updateDeltaLinks(userId, {
    calendarDeltaLink: newCalendarDeltaLink,
    emailDeltaLink: newEmailDeltaLink,
    sentEmailDeltaLink: newSentEmailDeltaLink,
  });
}

export async function setupSubscriptions(
  userId: string,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
): Promise<void> {
  const token = await getFreshOutlookAccessToken(
    userId,
    outlookDb,
    graphAuthService
  );
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
    const calRes = await graphMailService.createSubscription(token, {
      changeType: "created,updated,deleted",
      notificationUrl,
      resource: "/me/events",
      expirationDateTime: expiration.toISOString(),
      clientState,
    });
    calendarSubscriptionId = calRes.id;
  } catch (err) {
    console.error("[outlook_sync] Calendar subscription setup failed:", err);
  }

  try {
    const mailRes = await graphMailService.createSubscription(token, {
      changeType: "created,updated,deleted",
      notificationUrl,
      resource: "/me/messages",
      expirationDateTime: expiration.toISOString(),
      clientState,
    });
    emailSubscriptionId = mailRes.id;
  } catch (err) {
    console.error("[outlook_sync] Email subscription setup failed:", err);
  }

  await outlookDb.upsertSubscriptions(userId, {
    calendarSubscriptionId,
    emailSubscriptionId,
    clientState,
    subscriptionExpiration: expiration.getTime(),
  });
}

export async function renewSubscriptions(
  userId: string,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
): Promise<void> {
  const token = await getFreshOutlookAccessToken(
    userId,
    outlookDb,
    graphAuthService
  );
  if (!token) return;

  const rows = await outlookDb.getSyncState(userId);

  if (!rows.length) return;

  const { calendarSubscriptionId, emailSubscriptionId } = rows[0];
  const newExpiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  let anyFailed = false;

  for (const subId of [calendarSubscriptionId, emailSubscriptionId]) {
    if (!subId) continue;
    try {
      await graphMailService.renewSubscription(
        token,
        subId,
        newExpiration.toISOString()
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
    await setupSubscriptions(
      userId,
      outlookDb,
      graphAuthService,
      graphMailService
    );
    return;
  }

  await outlookDb.updateSubscriptionExpiration(userId, newExpiration.getTime());
}

export async function removeSubscriptions(
  userId: string,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
): Promise<void> {
  const rows = await outlookDb.getSyncState(userId);

  if (!rows.length) return;

  const { calendarSubscriptionId, emailSubscriptionId } = rows[0];

  const token = await getFreshOutlookAccessToken(
    userId,
    outlookDb,
    graphAuthService
  );

  if (token) {
    for (const subId of [calendarSubscriptionId, emailSubscriptionId]) {
      if (!subId) continue;
      try {
        await graphMailService.deleteSubscription(token, subId);
      } catch (err) {
        console.error(
          `[outlook_sync] Failed to delete subscription ${subId}:`,
          err
        );
      }
    }
  }
}
