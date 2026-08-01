import { getCurrentUser } from "@/lib/supabase/auth";
import type { ScheduledEmailsDB, UserRows } from "@db/scheduled_emails_db";
import {
  type EmailAttachmentInput,
  MAX_ATTACHMENT_BYTES,
  MAX_HTML_BODY,
  MAX_NAME,
  MAX_SHORT,
  MAX_TITLE,
  ValidationError,
  optionalString,
  requireDateString,
  requireEmail,
  requireInt,
  requireOneOf,
  requireString,
  validateAttachmentsArray,
} from "./util/validation";
import { sanitizeEmailHtml } from "./util/html_sanitizer";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import { ScheduledEmailServiceInterface } from "@/api_client/ms_graph/scheduled_email_service";
import type { OutlookDB } from "@db/outlook_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import {
  appendAttachmentLinks,
  resolveAttachmentBuffer,
} from "@/lib/util/attachments";

const RECURRING_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;

export type SendScheduledEmailResult =
  | { outcome: "sent" }
  | { outcome: "skipped" } // claim miss: missing, already sent, or cancelled
  | { outcome: "retry"; error: string } // transient pre-send error; row reset to pending
  | { outcome: "failed"; error: string }; // row marked failed + errorMessage

export async function parseEmailAddress(raw: string): Promise<{
  name: string;
  email: string;
}> {
  const match = raw?.match(/^(.*?)\s*<(.+?)>$/); // "Name <email>" or "Name<email>"
  if (match)
    return {
      name: match[1].trim().replace(/^"|"$/g, ""), // remove surrounding quotes
      email: match[2].trim(), // remove surrounding whitespace
    };
  return { name: "", email: raw?.trim() ?? "" };
}

export async function sendScheduledEmail(
  scheduledEmailId: number,
  dbDrizzle: ScheduledEmailsDB,
  apiClient: ScheduledEmailServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  storage: StorageClientInterface
): Promise<SendScheduledEmailResult> {
  const claimed = await dbDrizzle.claimEmail(scheduledEmailId);
  if (!claimed.length) return { outcome: "skipped" }; // missing, already sent, or claimed by Send Now
  const scheduledEmail = claimed[0];
  const userId = scheduledEmail.userId;

  // Token refresh and the user lookup can fail transiently (network/DB
  // blips) — keep them out of the catch-to-failed block below so a blip
  // doesn't permanently mark the row "failed"; instead release the claim
  // back to "pending" so the cron retries it on the next tick.
  let accessToken: string | null;
  let userRows: UserRows;
  try {
    accessToken = await getFreshOutlookAccessToken(
      userId,
      outlookDb,
      graphAuthService
    );
    userRows = accessToken ? await dbDrizzle.getUserRows(userId) : [];
  } catch (lookupErr: unknown) {
    const errMsg =
      lookupErr instanceof Error ? lookupErr.message : "Pre-send lookup failed";
    console.error(
      "[process_scheduled_emails] transient pre-send error for",
      scheduledEmailId,
      lookupErr
    );
    await dbDrizzle.unclaimEmail(scheduledEmailId);
    return { outcome: "retry", error: errMsg };
  }

  if (!accessToken) {
    await dbDrizzle.markAsFailed(scheduledEmailId);
    return { outcome: "failed", error: "Outlook not connected for user" };
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const fromName = userRows[0]?.name || "";
    let fromEmail = userRows[0]?.email || "";
    const toEmailAddr =
      (await parseEmailAddress(scheduledEmail.toEmail)).email ||
      scheduledEmail.toEmail;

    try {
      // Get the user email connected to the Graph API to be as fromEmail
      // in case the DB users.email and the connected outlook email are not the same
      const profileRes = await apiClient.getProfile(headers);
      fromEmail = profileRes.mail || profileRes.userPrincipalName || fromEmail;
    } catch {
      console.warn(
        "[process_scheduled_emails] Graph /me failed; using account email"
      );
    }

    const attachments = scheduledEmail.attachments ?? [];
    const urlAttachments = attachments.filter(
      (a) => a.url && !a.data && !a.path
    );
    const fileAttachments = attachments.filter((a) => a.data || a.path);

    const messagePayload = {
      subject: scheduledEmail.subject,
      body: {
        contentType: "HTML",
        content: appendAttachmentLinks(scheduledEmail.bodyHtml, urlAttachments),
      },
      toRecipients: [
        {
          emailAddress: {
            address: toEmailAddr,
            name: scheduledEmail.toName || scheduledEmail.toEmail,
          },
        },
      ],
    };

    const draftRes = await apiClient.draftMessage(headers, messagePayload);
    const outlookId = draftRes.id;
    const conversationId = draftRes.conversationId;

    for (const att of fileAttachments) {
      const buffer = await resolveAttachmentBuffer(att, storage);
      if (!buffer) continue;
      if (buffer.length > MAX_ATTACHMENT_BYTES) {
        throw new Error(
          `Attachment "${att.name}" exceeds the ${MAX_ATTACHMENT_BYTES} byte limit for scheduled sends`
        );
      }
      await apiClient.addAttachment(headers, outlookId, {
        name: att.name,
        contentType: att.mimeType ?? "application/octet-stream",
        contentBytes: buffer.toString("base64"),
      });
    }

    await apiClient.sendDraftMessage(headers, outlookId);

    // The email is delivered from here on — bookkeeping failures must not
    // flip the claimed row to "failed" or reject the send, or a retry would
    // deliver a duplicate.
    try {
      let clientId: number | null = scheduledEmail.clientId;
      if (!clientId) {
        const allClients = await dbDrizzle.getAllClients(userId);
        for (const c of allClients) {
          if (c.email?.toLowerCase() === toEmailAddr.toLowerCase()) {
            clientId = c.id;
            break;
          }
        }
      }

      // fromEmail is the connected Graph API email address or the fallback DB users.email
      await dbDrizzle.insertOutlookEmail(
        outlookId,
        conversationId,
        scheduledEmail,
        fromEmail,
        fromName,
        clientId,
        userId
      );
    } catch (bookkeepingErr) {
      console.error(
        "[process_scheduled_emails] post-send bookkeeping failed for",
        scheduledEmailId,
        bookkeepingErr
      );
    }
    return { outcome: "sent" };
  } catch (sendErr: unknown) {
    const errMsg = sendErr instanceof Error ? sendErr.message : "Send failed";
    console.error("[process_scheduled_emails]", scheduledEmailId, sendErr);
    await dbDrizzle.catchFailedInsertOutlookEmail(errMsg, scheduledEmailId);
    return { outcome: "failed", error: errMsg };
  }
}

export async function getScheduledEmails(dbDrizzle: ScheduledEmailsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  return dbDrizzle.getScheduledEmailsByUser(user.id);
}

export async function processDueScheduledEmails(
  dbDrizzle: ScheduledEmailsDB,
  apiClient: ScheduledEmailServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  storage: StorageClientInterface
): Promise<{ processed: number }> {
  const dueEmails = await dbDrizzle.getDueScheduledEmailIds();
  const results = await Promise.allSettled(
    dueEmails.map((e) =>
      sendScheduledEmail(
        e.id,
        dbDrizzle,
        apiClient,
        outlookDb,
        graphAuthService,
        storage
      )
    )
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        "[cron/process-scheduled-emails] failed for id",
        dueEmails[i].id,
        r.reason
      );
    }
  });

  return { processed: dueEmails.length };
}

export interface ScheduleEmailInput {
  toEmail: string;
  toName?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  scheduledAt: string;
  timezone?: string | null;
  recurring?: string | null;
  clientId?: number | null;
  attachments?: EmailAttachmentInput[];
}

export async function createScheduledEmail(
  input: ScheduleEmailInput,
  dbDrizzle: ScheduledEmailsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const toEmail = requireEmail(input.toEmail, "toEmail");
  const toName = optionalString(input.toName, "toName", MAX_NAME) ?? null;
  const subject = requireString(input.subject, "subject", MAX_TITLE);
  const bodyHtml = sanitizeEmailHtml(
    requireString(input.bodyHtml, "bodyHtml", MAX_HTML_BODY)
  );
  const bodyText =
    optionalString(input.bodyText, "bodyText", MAX_HTML_BODY) ?? null;
  const scheduledAt = requireDateString(input.scheduledAt, "scheduledAt");
  const timezone =
    optionalString(input.timezone, "timezone", MAX_SHORT) ?? "UTC";
  const recurring = input.recurring
    ? requireOneOf(input.recurring, "recurring", RECURRING_OPTIONS)
    : "none";
  const clientId =
    input.clientId !== undefined && input.clientId !== null
      ? requireInt(input.clientId, "clientId")
      : null;
  const attachments = validateAttachmentsArray(input.attachments) ?? null;
  attachments?.forEach((att) => {
    if (
      att.data &&
      Buffer.from(att.data, "base64").length > MAX_ATTACHMENT_BYTES
    ) {
      throw new ValidationError(
        `attachment "${att.name}" exceeds the ${MAX_ATTACHMENT_BYTES} byte limit`
      );
    }
  });

  if (scheduledAt < new Date()) {
    throw new ValidationError("Scheduled date must be in the future");
  }

  return dbDrizzle.insertScheduledEmail({
    toEmail,
    toName,
    subject,
    bodyHtml,
    bodyText,
    scheduledAt,
    timezone,
    recurring,
    status: "pending",
    attachments,
    clientId,
    userId: user.id,
  });
}

export async function sendScheduledEmailNow(
  id: number,
  dbDrizzle: ScheduledEmailsDB,
  apiClient: ScheduledEmailServiceInterface,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  storage: StorageClientInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");

  // Ownership check — sendScheduledEmail is cron-scoped and has none
  const rows = await dbDrizzle.getScheduledEmailById(numericId, user.id);
  if (!rows.length) {
    throw new ValidationError("Scheduled email not found", 404);
  }

  const result = await sendScheduledEmail(
    numericId,
    dbDrizzle,
    apiClient,
    outlookDb,
    graphAuthService,
    storage
  );
  if (result.outcome === "skipped") {
    throw new ValidationError(
      "Scheduled email was already sent or cancelled",
      409
    );
  }
  if (result.outcome === "retry") {
    throw new ValidationError(
      result.error || "Temporary error, please try again",
      503
    );
  }
  if (result.outcome === "failed") {
    throw new ValidationError(result.error || "Send failed", 502);
  }

  return { success: true };
}

export async function deleteScheduledEmail(
  id: number,
  dbDrizzle: ScheduledEmailsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");
  const rows = await dbDrizzle.getScheduledEmailById(numericId, user.id);
  if (!rows.length) {
    throw new ValidationError("Scheduled email not found", 404);
  }

  const deleted = await dbDrizzle.deleteScheduledEmailById(numericId, user.id);
  if (!deleted.length) {
    // Row exists but the guarded delete matched nothing — it was already sent
    throw new ValidationError(
      "Scheduled email was already sent and cannot be deleted",
      409
    );
  }
  return { success: true };
}
