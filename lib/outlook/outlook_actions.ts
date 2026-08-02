import { getCurrentUser } from "@/lib/supabase/auth";
import type { OutlookDB, OutlookEmailUpdateData } from "@db/classes/outlook_db";
import type { CalendarDB } from "@db/classes/calendar_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import type { GraphMailServiceInterface } from "@/api_client/ms_graph/graph_mail_service";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import type { OpenAIClientInterface } from "@/api_client/openai_client";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import { performIncrementalSync } from "@/lib/outlook/outlook_sync";
import { sanitizeEmailHtml } from "@/lib/util/html_sanitizer";
import {
  appendAttachmentLinks,
  resolveAttachmentBuffer,
} from "@/lib/util/attachments";
import {
  type EmailAttachmentInput,
  MAX_HTML_BODY,
  MAX_NAME,
  MAX_RECIPIENTS,
  MAX_SHORT,
  MAX_TITLE,
  ValidationError,
  optionalString,
  requireEmail,
  requireInt,
  requireOneOf,
  requireString,
  validateAttachmentsArray,
} from "../util/validation";

const LARGE_ATTACHMENT_THRESHOLD = 3 * 1024 * 1024;
const UPLOAD_CHUNK_SIZE = 3 * 327_680;

const MESSAGE_ACTIONS = [
  "star",
  "unstar",
  "archive",
  "unarchive",
  "markRead",
  "markUnread",
] as const;
type MessageAction = (typeof MESSAGE_ACTIONS)[number];

export interface SendOutlookEmailInput {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  cc?: string[];
  threadId?: string;
  replyToOutlookId?: string;
  attachments?: EmailAttachmentInput[];
}

function buildRecipient(address: string, name?: string) {
  return { emailAddress: { address, name: name ?? address } };
}

function validateSendInput(raw: SendOutlookEmailInput): SendOutlookEmailInput {
  const to = requireEmail(raw.to, "to");
  const toName = optionalString(raw.toName, "toName", MAX_NAME);
  const subject = requireString(raw.subject, "subject", MAX_TITLE);
  const bodyHtml = sanitizeEmailHtml(
    requireString(raw.bodyHtml, "bodyHtml", MAX_HTML_BODY)
  );
  const bodyText = optionalString(raw.bodyText, "bodyText", MAX_HTML_BODY);
  const threadId = optionalString(raw.threadId, "threadId", MAX_SHORT);
  const replyToOutlookId = optionalString(
    raw.replyToOutlookId,
    "replyToOutlookId",
    MAX_SHORT
  );

  let cc: string[] | undefined;
  if (Array.isArray(raw.cc)) {
    if (raw.cc.length > MAX_RECIPIENTS) {
      throw new ValidationError(
        `cc exceeds max recipients of ${MAX_RECIPIENTS}`
      );
    }
    cc = raw.cc.map((c, i) => requireEmail(c, `cc[${i}]`));
  }

  const attachments = validateAttachmentsArray(raw.attachments);

  return {
    to,
    toName,
    subject,
    bodyHtml,
    bodyText,
    threadId,
    replyToOutlookId,
    cc,
    attachments,
  };
}

export interface OutlookInboxMessage {
  id: string;
  outlookId: string;
  conversationId: string;
  type: "email";
  from: string;
  fromEmail: string | null;
  initials: string;
  subject: string | null;
  preview: string;
  body: string | null;
  timestamp: Date | null;
  unread: boolean;
  starred: boolean;
  archived: boolean;
  sent: boolean;
  hasAttachments: boolean;
  client: string;
  clientId: number | null;
}

export interface ListOutlookEmailsResult {
  messages: OutlookInboxMessage[];
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Reads previously-synced Outlook emails from the local cache (no Graph calls). */
export async function listOutlookEmails(
  userId: string,
  options: {
    page: number;
    limit: number;
    search: string;
    filter: "all" | "unread" | "starred" | "sent" | "archived";
  },
  outlookDb: OutlookDB
): Promise<ListOutlookEmailsResult> {
  const offset = (options.page - 1) * options.limit;

  // Fetch one extra row so we can tell if another page exists without a COUNT query.
  const rows = await outlookDb.getEmailsForUser(userId, {
    search: options.search,
    filter: options.filter,
    limit: options.limit + 1,
    offset,
  });

  const hasMore = rows.length > options.limit;
  const pageRows = hasMore ? rows.slice(0, options.limit) : rows;

  const messages: OutlookInboxMessage[] = pageRows.map((email) => ({
    id: String(email.id),
    outlookId: email.outlookId,
    conversationId: email.conversationId,
    type: "email",
    from: email.fromName || email.fromEmail || "Unknown",
    fromEmail: email.fromEmail,
    initials:
      (email.fromName || email.fromEmail || "?")
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() || "")
        .join("") || "?",
    subject: email.subject,
    preview: email.snippet || (email.bodyText?.slice(0, 150) ?? ""),
    body: email.bodyHtml || email.bodyText,
    timestamp: email.sentAt,
    unread: !email.isRead,
    starred: email.isStarred ?? false,
    archived: email.isArchived ?? false,
    sent: email.isSent ?? false,
    hasAttachments: email.hasAttachments ?? false,
    client: email.clientName || "",
    clientId: email.clientId,
  }));

  return { messages, page: options.page, limit: options.limit, hasMore };
}

export async function syncOutlookInbox(
  outlookDb: OutlookDB,
  calendarDb: CalendarDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface,
  storage: StorageClientInterface,
  openaiClient: OpenAIClientInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  await performIncrementalSync(
    user.id,
    outlookDb,
    calendarDb,
    graphAuthService,
    graphMailService,
    storage,
    openaiClient
  );
  return { success: true };
}

export async function sendOutlookEmail(
  raw: SendOutlookEmailInput,
  outlookDb: OutlookDB,
  storage: StorageClientInterface,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const input = validateSendInput(raw);
  const token = await getFreshOutlookAccessToken(
    user.id,
    outlookDb,
    graphAuthService
  );
  if (!token) throw new ValidationError("Outlook account not connected", 403);

  try {
    const fileAttachments = (input.attachments ?? []).filter(
      (a) => a.data || a.path
    );
    const urlAttachments = (input.attachments ?? []).filter(
      (a) => a.url && !a.data && !a.path
    );

    const messagePayload = {
      subject: input.subject,
      body: {
        contentType: "HTML",
        content: appendAttachmentLinks(input.bodyHtml, urlAttachments),
      },
      toRecipients: [buildRecipient(input.to, input.toName)],
      ...(input.cc?.length
        ? { ccRecipients: input.cc.map((addr) => buildRecipient(addr)) }
        : {}),
    };

    if (fileAttachments.length === 0) {
      if (input.replyToOutlookId) {
        await graphMailService.replyMail(
          token,
          input.replyToOutlookId,
          messagePayload
        );
      } else {
        await graphMailService.sendMail(token, messagePayload);
      }
    } else {
      let draftId: string;
      if (input.replyToOutlookId) {
        const res = await graphMailService.createReplyDraft(
          token,
          input.replyToOutlookId,
          messagePayload
        );
        draftId = res.id;
      } else {
        const res = await graphMailService.createDraft(token, messagePayload);
        draftId = res.id;
      }

      for (const att of fileAttachments) {
        const buffer = await resolveAttachmentBuffer(att, storage);
        if (!buffer) continue;
        const contentType = att.mimeType ?? "application/octet-stream";
        if (buffer.length < LARGE_ATTACHMENT_THRESHOLD) {
          await graphMailService.addSmallAttachment(token, draftId, {
            name: att.name,
            contentType,
            contentBytes: buffer.toString("base64"),
          });
        } else {
          const { uploadUrl } = await graphMailService.createUploadSession(
            token,
            draftId,
            att.name,
            buffer.length
          );

          let offset = 0;
          while (offset < buffer.length) {
            const end = Math.min(offset + UPLOAD_CHUNK_SIZE, buffer.length);
            const chunk = buffer.slice(offset, end);
            await graphMailService.uploadChunk(
              uploadUrl,
              chunk,
              contentType,
              `bytes ${offset}-${end - 1}/${buffer.length}`
            );
            offset = end;
          }
        }
      }

      await graphMailService.sendDraft(token, draftId);
    }
  } catch (err) {
    console.error("[outlook_actions] sendOutlookEmail failed:", err);
    throw err;
  }

  return { success: true };
}

export async function updateOutlookMessage(
  id: number,
  action: string,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");
  const validAction: MessageAction = requireOneOf(
    action,
    "action",
    MESSAGE_ACTIONS
  );

  const [email] = await outlookDb.getEmailById(numericId, user.id);

  if (!email) throw new ValidationError("Not found", 404);

  const dbUpdate: OutlookEmailUpdateData = {};
  const graphUpdate: Record<string, unknown> = {};

  if (validAction === "star" || validAction === "unstar") {
    dbUpdate.isStarred = validAction === "star";
    graphUpdate.flag = {
      flagStatus: validAction === "star" ? "flagged" : "notFlagged",
    };
  }
  if (validAction === "archive" || validAction === "unarchive") {
    dbUpdate.isArchived = validAction === "archive";
    graphUpdate.archive = validAction === "archive" ? "archive" : "inbox";
  }
  if (validAction === "markRead" || validAction === "markUnread") {
    dbUpdate.isRead = validAction === "markRead";
    graphUpdate.isRead = validAction === "markRead";
  }

  if (Object.keys(dbUpdate).length > 0) {
    await outlookDb.updateEmail(numericId, dbUpdate);
  }

  const graphFields = { ...graphUpdate };
  delete graphFields.flag;
  const graphPatch = Object.keys(graphFields).length > 0 ? graphFields : null;

  try {
    const token = await getFreshOutlookAccessToken(
      user.id,
      outlookDb,
      graphAuthService
    );
    if (token) {
      if (graphPatch) {
        await graphMailService.patchMessage(token, email.outlookId, graphPatch);
      }
      if (graphUpdate.flag) {
        await graphMailService.patchMessage(token, email.outlookId, {
          flag: graphUpdate.flag,
        });
      }
      if (validAction === "archive" || validAction === "unarchive") {
        await graphMailService.moveMessage(
          token,
          email.outlookId,
          graphUpdate.archive as string
        );
      }
    }
  } catch (err) {
    console.error("[outlook_actions] Graph sync failed:", err);
  }

  return { success: true };
}

export async function deleteOutlookMessage(
  id: number,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");

  const rows = await outlookDb.getEmailById(numericId, user.id);

  if (!rows.length) throw new ValidationError("Not found", 404);

  await outlookDb.deleteEmail(numericId);

  try {
    const token = await getFreshOutlookAccessToken(
      user.id,
      outlookDb,
      graphAuthService
    );
    if (token) {
      await graphMailService.deleteMessage(token, rows[0].outlookId);
    }
  } catch (err) {
    console.error("[outlook_actions] Graph delete failed:", err);
  }

  return { success: true };
}
