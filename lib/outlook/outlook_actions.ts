"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { outlookEmails } from "@db/schema";
import { and, eq, InferSelectModel } from "drizzle-orm";
import axios from "axios";
import { performIncrementalSync } from "@/lib/outlook/outlook_sync";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import { downloadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase/supabase";
import { sanitizeEmailHtml } from "@/lib/util/html_sanitizer";
import {
  MAX_ATTACHMENTS,
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
} from "../util/validation";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
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

export interface OutlookAttachmentInput {
  name: string;
  data?: string;
  path?: string;
  url?: string;
  mimeType?: string;
}

export interface SendOutlookEmailInput {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  cc?: string[];
  threadId?: string;
  replyToOutlookId?: string;
  attachments?: OutlookAttachmentInput[];
}

function buildRecipient(address: string, name?: string) {
  return { emailAddress: { address, name: name ?? address } };
}

function buildBodyHtml(html: string, urlAttachments: OutlookAttachmentInput[]) {
  if (urlAttachments.length === 0) return html;
  const links = urlAttachments
    .map((a) => `<a href="${a.url}">${a.name}</a>`)
    .join("<br>");
  return `${html}<br><br>${links}`;
}

async function resolveBuffer(
  att: OutlookAttachmentInput
): Promise<Buffer | null> {
  if (att.data) return Buffer.from(att.data, "base64");
  if (att.path) {
    const bytes = await downloadFile(FILES_BUCKET, att.path);
    return Buffer.from(bytes);
  }
  return null;
}

function validateAttachment(
  att: OutlookAttachmentInput,
  index: number
): OutlookAttachmentInput {
  const name = requireString(att.name, `attachments[${index}].name`, MAX_NAME);
  const mimeType = optionalString(
    att.mimeType,
    `attachments[${index}].mimeType`,
    MAX_SHORT
  );
  const url = optionalString(att.url, `attachments[${index}].url`, 2048);
  const path = optionalString(att.path, `attachments[${index}].path`, 1024);
  if (att.data && typeof att.data !== "string") {
    throw new ValidationError(`attachments[${index}].data must be a string`);
  }
  return { name, mimeType, url, path, data: att.data };
}

function validateSendInput(
  raw: Partial<SendOutlookEmailInput>
): SendOutlookEmailInput {
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

  let attachments: OutlookAttachmentInput[] | undefined;
  if (Array.isArray(raw.attachments)) {
    if (raw.attachments.length > MAX_ATTACHMENTS) {
      throw new ValidationError(
        `attachments exceeds max of ${MAX_ATTACHMENTS}`
      );
    }
    attachments = raw.attachments.map(validateAttachment);
  }

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

async function addSmallAttachment(
  draftId: string,
  token: string,
  name: string,
  contentType: string,
  buffer: Buffer
) {
  await axios.post(
    `${GRAPH_BASE}/me/messages/${draftId}/attachments`,
    {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name,
      contentType,
      contentBytes: buffer.toString("base64"),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
}

async function addLargeAttachment(
  draftId: string,
  token: string,
  name: string,
  contentType: string,
  buffer: Buffer
) {
  const sessionRes = await axios.post<{ uploadUrl: string }>(
    `${GRAPH_BASE}/me/messages/${draftId}/attachments/createUploadSession`,
    {
      AttachmentItem: { attachmentType: "file", name, size: buffer.length },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  const { uploadUrl } = sessionRes.data;

  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + UPLOAD_CHUNK_SIZE, buffer.length);
    const chunk = buffer.slice(offset, end);
    await axios.put(uploadUrl, chunk, {
      headers: {
        "Content-Range": `bytes ${offset}-${end - 1}/${buffer.length}`,
        "Content-Type": contentType,
        "Content-Length": String(chunk.length),
      },
    });
    offset = end;
  }
}

export async function syncOutlookInbox() {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  await performIncrementalSync(user.id);
  return { success: true };
}

export async function sendOutlookEmail(raw: Partial<SendOutlookEmailInput>) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const input = validateSendInput(raw);
  const token = await getFreshOutlookAccessToken(user.id);
  if (!token) throw new ValidationError("Outlook account not connected", 403);

  try {
    const fileAttachments = (input.attachments ?? []).filter(
      (a) => a.data || a.path
    );
    const urlAttachments = (input.attachments ?? []).filter(
      (a) => a.url && !a.data && !a.path
    );

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const messagePayload = {
      subject: input.subject,
      body: {
        contentType: "HTML",
        content: buildBodyHtml(input.bodyHtml, urlAttachments),
      },
      toRecipients: [buildRecipient(input.to, input.toName)],
      ...(input.cc?.length
        ? { ccRecipients: input.cc.map((addr) => buildRecipient(addr)) }
        : {}),
    };

    if (fileAttachments.length === 0) {
      if (input.replyToOutlookId) {
        await axios.post(
          `${GRAPH_BASE}/me/messages/${input.replyToOutlookId}/reply`,
          { message: messagePayload },
          { headers }
        );
      } else {
        await axios.post(
          `${GRAPH_BASE}/me/sendMail`,
          { message: messagePayload, saveToSentItems: true },
          { headers }
        );
      }
    } else {
      let draftId: string;
      if (input.replyToOutlookId) {
        const res = await axios.post<{ id: string }>(
          `${GRAPH_BASE}/me/messages/${input.replyToOutlookId}/createReply`,
          { message: messagePayload },
          { headers }
        );
        draftId = res.data.id;
      } else {
        const res = await axios.post<{ id: string }>(
          `${GRAPH_BASE}/me/messages`,
          messagePayload,
          { headers }
        );
        draftId = res.data.id;
      }

      for (const att of fileAttachments) {
        const buffer = await resolveBuffer(att);
        if (!buffer) continue;
        const contentType = att.mimeType ?? "application/octet-stream";
        if (buffer.length < LARGE_ATTACHMENT_THRESHOLD) {
          await addSmallAttachment(
            draftId,
            token,
            att.name,
            contentType,
            buffer
          );
        } else {
          await addLargeAttachment(
            draftId,
            token,
            att.name,
            contentType,
            buffer
          );
        }
      }

      await axios.post(
        `${GRAPH_BASE}/me/messages/${draftId}/send`,
        {},
        { headers }
      );
    }
  } catch (err) {
    console.error("[outlook_actions] sendOutlookEmail failed:", err);
    throw err;
  }

  return { success: true };
}

type EmailUpdate = Partial<
  Pick<
    InferSelectModel<typeof outlookEmails>,
    "isStarred" | "isArchived" | "isRead"
  >
>;

export async function updateOutlookMessage(id: number, action: string) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");
  const validAction: MessageAction = requireOneOf(
    action,
    "action",
    MESSAGE_ACTIONS
  );

  const [email] = await db
    .select()
    .from(outlookEmails)
    .where(
      and(eq(outlookEmails.id, numericId), eq(outlookEmails.userId, user.id))
    )
    .limit(1);

  if (!email) throw new ValidationError("Not found", 404);

  const dbUpdate: EmailUpdate = {};
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
    await db
      .update(outlookEmails)
      .set(dbUpdate)
      .where(eq(outlookEmails.id, numericId));
  }

  const graphFields = { ...graphUpdate };
  delete graphFields.flag;
  const graphPatch = Object.keys(graphFields).length > 0 ? graphFields : null;

  try {
    const token = await getFreshOutlookAccessToken(user.id);
    if (token) {
      if (graphPatch) {
        await axios.patch(
          `${GRAPH_BASE}/me/messages/${email.outlookId}`,
          graphPatch,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      if (graphUpdate.flag) {
        await axios.patch(
          `${GRAPH_BASE}/me/messages/${email.outlookId}`,
          { flag: graphUpdate.flag },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      if (validAction === "archive" || validAction === "unarchive") {
        await axios.post(
          `${GRAPH_BASE}/me/messages/${email.outlookId}/move`,
          { destinationId: graphUpdate.archive },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    }
  } catch (err) {
    console.error("[outlook_actions] Graph sync failed:", err);
  }

  return { success: true };
}

export async function deleteOutlookMessage(id: number) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");

  const rows = await db
    .select()
    .from(outlookEmails)
    .where(
      and(eq(outlookEmails.id, numericId), eq(outlookEmails.userId, user.id))
    )
    .limit(1);

  if (!rows.length) throw new ValidationError("Not found", 404);

  await db.delete(outlookEmails).where(eq(outlookEmails.id, numericId));

  try {
    const token = await getFreshOutlookAccessToken(user.id);
    if (token) {
      await axios.delete(`${GRAPH_BASE}/me/messages/${rows[0].outlookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (err) {
    console.error("[outlook_actions] Graph delete failed:", err);
  }

  return { success: true };
}
