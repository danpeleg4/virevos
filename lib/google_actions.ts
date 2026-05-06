"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { googleEmails, clients } from "@db/schema";
import { and, eq } from "drizzle-orm";
import axios from "axios";
import {
  getGmailClient,
  buildRawEmail,
  parseEmailAddress,
  EmailAttachment,
} from "@/lib/gmail_client";
import { performGmailSync } from "@/lib/gmail_sync";
import { downloadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase";
import { sanitizeEmailHtml } from "@/lib/html_sanitizer";
import {
  MAX_ATTACHMENTS,
  MAX_HTML_BODY,
  MAX_NAME,
  MAX_SHORT,
  MAX_TITLE,
  ValidationError,
  optionalString,
  requireEmail,
  requireInt,
  requireOneOf,
  requireString,
} from "./validation";

const MESSAGE_ACTIONS = [
  "star",
  "unstar",
  "archive",
  "unarchive",
  "markRead",
  "markUnread",
  "trash",
] as const;
type MessageAction = (typeof MESSAGE_ACTIONS)[number];

const labelActions: Record<
  MessageAction,
  { addLabels?: string[]; removeLabels?: string[] }
> = {
  star: { addLabels: ["STARRED"] },
  unstar: { removeLabels: ["STARRED"] },
  archive: { removeLabels: ["INBOX"] },
  unarchive: { addLabels: ["INBOX"] },
  markRead: { removeLabels: ["UNREAD"] },
  markUnread: { addLabels: ["UNREAD"] },
  trash: { addLabels: ["TRASH"], removeLabels: ["INBOX"] },
};

export interface GoogleAttachmentInput {
  name: string;
  url?: string;
  path?: string;
  data?: string;
  mimeType?: string;
}

export interface SendGmailInput {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  threadId?: string;
  attachments?: GoogleAttachmentInput[];
}

function validateAttachment(
  att: GoogleAttachmentInput,
  index: number
): GoogleAttachmentInput {
  return {
    name: requireString(att.name, `attachments[${index}].name`, MAX_NAME),
    mimeType: optionalString(
      att.mimeType,
      `attachments[${index}].mimeType`,
      MAX_SHORT
    ),
    url: optionalString(att.url, `attachments[${index}].url`, 2048),
    path: optionalString(att.path, `attachments[${index}].path`, 1024),
    data: typeof att.data === "string" ? att.data : undefined,
  };
}

function validateSendInput(raw: SendGmailInput): SendGmailInput {
  const to = requireEmail(raw.to, "to");
  const toName = optionalString(raw.toName, "toName", MAX_NAME);
  const subject = requireString(raw.subject, "subject", MAX_TITLE);
  const bodyHtml = sanitizeEmailHtml(
    requireString(raw.bodyHtml, "bodyHtml", MAX_HTML_BODY)
  );
  const bodyText = optionalString(raw.bodyText, "bodyText", MAX_HTML_BODY);
  const threadId = optionalString(raw.threadId, "threadId", MAX_SHORT);

  let attachments: GoogleAttachmentInput[] | undefined;
  if (Array.isArray(raw.attachments)) {
    if (raw.attachments.length > MAX_ATTACHMENTS) {
      throw new ValidationError(
        `attachments exceeds max of ${MAX_ATTACHMENTS}`
      );
    }
    attachments = raw.attachments.map(validateAttachment);
  }

  return { to, toName, subject, bodyHtml, bodyText, threadId, attachments };
}

export async function syncGmailInbox() {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  return await performGmailSync(user.id);
}

export async function sendGmail(raw: SendGmailInput) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const input = validateSendInput(raw);

  const gmail = await getGmailClient(user.id);
  if (!gmail) {
    throw new ValidationError(
      "Gmail not connected. Please connect your Google account.",
      400
    );
  }

  const profileRes = await gmail.users.getProfile({ userId: "me" });
  const fromEmail =
    profileRes.data.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    "";
  const fromName = user.fullName || "";

  const attachments: EmailAttachment[] = [];
  if (input.attachments && input.attachments.length > 0) {
    for (const att of input.attachments) {
      try {
        let buffer: Buffer | null = null;
        let mimeType = "application/octet-stream";

        if (att.data) {
          buffer = Buffer.from(att.data, "base64");
          mimeType = att.mimeType || mimeType;
        } else if (att.path) {
          buffer = Buffer.from(await downloadFile(FILES_BUCKET, att.path));
          mimeType = att.mimeType || mimeType;
        } else if (att.url) {
          const res = await axios.get<ArrayBuffer>(att.url, {
            responseType: "arraybuffer",
          });
          buffer = Buffer.from(res.data);
        }

        if (!buffer) continue;
        attachments.push({
          name: att.name,
          contentBase64: buffer.toString("base64"),
          mimeType,
        });
      } catch (err) {
        console.error(`Failed to fetch attachment "${att.name}":`, err);
      }
    }
  }

  const rawEmail = buildRawEmail({
    to: input.to,
    toName: input.toName,
    from: fromEmail,
    fromName,
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  const sendParams = {
    userId: "me",
    requestBody: {
      raw: rawEmail,
      ...(input.threadId ? { threadId: input.threadId } : {}),
    },
  };

  const sendRes = await gmail.users.messages.send(sendParams);
  const gmailId = sendRes.data.id!;
  const sentThreadId = sendRes.data.threadId!;

  let clientId: number | null = null;
  const toEmailAddr = parseEmailAddress(input.to).email || input.to;

  const allClients = await db
    .select({ id: clients.id, email: clients.email })
    .from(clients)
    .where(eq(clients.userId, user.id));
  for (const c of allClients) {
    if (c.email?.toLowerCase() === toEmailAddr.toLowerCase()) {
      clientId = c.id;
      break;
    }
  }

  await db.insert(googleEmails).values({
    gmailId,
    threadId: sentThreadId,
    subject: input.subject,
    snippet:
      input.bodyText?.slice(0, 200) ||
      input.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
    fromEmail,
    fromName,
    toEmails: [toEmailAddr],
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText || null,
    labelIds: ["SENT"],
    isRead: true,
    isStarred: false,
    isArchived: false,
    isSent: true,
    sentAt: new Date(),
    clientId,
    userId: user.id,
  });

  return { success: true, gmailId };
}

export async function updateGmailMessage(id: number, action: string) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");
  const validAction: MessageAction = requireOneOf(
    action,
    "action",
    MESSAGE_ACTIONS
  );

  const emailRow = await db
    .select()
    .from(googleEmails)
    .where(
      and(eq(googleEmails.id, numericId), eq(googleEmails.userId, user.id))
    )
    .limit(1);

  if (!emailRow.length) throw new ValidationError("Email not found", 404);
  const email = emailRow[0];

  const gmail = await getGmailClient(user.id);
  if (gmail && email.gmailId) {
    try {
      const ops = labelActions[validAction];
      await gmail.users.messages.modify({
        userId: "me",
        id: email.gmailId,
        requestBody: {
          addLabelIds: ops.addLabels ?? [],
          removeLabelIds: ops.removeLabels ?? [],
        },
      });
    } catch (gmailErr) {
      console.error("[google_actions] Gmail modify error:", gmailErr);
    }
  }

  const dbUpdate: Partial<typeof email> = {};
  if (validAction === "star") dbUpdate.isStarred = true;
  if (validAction === "unstar") dbUpdate.isStarred = false;
  if (validAction === "archive") dbUpdate.isArchived = true;
  if (validAction === "unarchive") dbUpdate.isArchived = false;
  if (validAction === "markRead") dbUpdate.isRead = true;
  if (validAction === "markUnread") dbUpdate.isRead = false;

  if (Object.keys(dbUpdate).length > 0) {
    await db
      .update(googleEmails)
      .set(dbUpdate)
      .where(eq(googleEmails.id, email.id));
  }

  return { success: true };
}

export async function deleteGmailMessage(id: number) {
  const user = await currentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const numericId = requireInt(id, "id");

  await db
    .delete(googleEmails)
    .where(
      and(eq(googleEmails.id, numericId), eq(googleEmails.userId, user.id))
    );

  return { success: true };
}
