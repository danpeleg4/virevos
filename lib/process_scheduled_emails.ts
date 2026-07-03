import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";
import { db } from "@db/db";
import { clients, outlookEmails, scheduledEmails, users } from "@db/schema";
import { eq } from "drizzle-orm";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export function parseEmailAddress(raw: string): {
  name: string;
  email: string;
} {
  const match = raw?.match(/^(.*?)\s*<(.+?)>$/);
  if (match)
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  return { name: "", email: raw?.trim() ?? "" };
}

export async function sendScheduledEmail(
  scheduledEmailId: number
): Promise<void> {
  const rows = await db
    .select()
    .from(scheduledEmails)
    .where(eq(scheduledEmails.id, scheduledEmailId))
    .limit(1);

  if (!rows.length) {
    console.error("Scheduled email not found:", scheduledEmailId);
    return;
  }

  const scheduledEmail = rows[0];

  if (scheduledEmail.status !== "pending") {
    return;
  }

  const userId = scheduledEmail.userId;

  try {
    const accessToken = await getFreshOutlookAccessToken(userId);

    if (!accessToken) {
      await db
        .update(scheduledEmails)
        .set({
          status: "failed",
          errorMessage: "Outlook not connected for user",
        })
        .where(eq(scheduledEmails.id, scheduledEmailId));
      return;
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const userRows = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    const fromName = userRows[0]?.name || "";

    let fromEmail = userRows[0]?.email || "";
    try {
      // Get the user email connected the the Graph API to be as fromEmail
      // in case the DB users.email and the connected outlook email are not the same
      const profileRes = await axios.get<{
        mail?: string;
        userPrincipalName?: string;
      }>(`${GRAPH_BASE}/me`, { headers });
      fromEmail =
        profileRes.data.mail || profileRes.data.userPrincipalName || fromEmail;
    } catch {
      console.warn(
        "[process_scheduled_emails] Graph /me failed; using account email"
      );
    }

    const messagePayload = {
      subject: scheduledEmail.subject,
      body: {
        contentType: "HTML",
        content: scheduledEmail.bodyHtml,
      },
      toRecipients: [
        {
          emailAddress: {
            address:
              parseEmailAddress(scheduledEmail.toEmail).email ||
              scheduledEmail.toEmail,
            name: scheduledEmail.toName || scheduledEmail.toEmail,
          },
        },
      ],
    };

    const draftRes = await axios.post<{
      id: string;
      conversationId: string;
    }>(`${GRAPH_BASE}/me/messages`, messagePayload, { headers });
    const outlookId = draftRes.data.id;
    const conversationId = draftRes.data.conversationId;

    await axios.post(
      `${GRAPH_BASE}/me/messages/${outlookId}/send`,
      {},
      { headers }
    );

    let clientId: number | null = scheduledEmail.clientId;
    if (!clientId) {
      const toEmailAddr =
        parseEmailAddress(scheduledEmail.toEmail).email ||
        scheduledEmail.toEmail;
      const allClients = await db
        .select({ id: clients.id, email: clients.email })
        .from(clients)
        .where(eq(clients.userId, userId));
      for (const c of allClients) {
        if (c.email?.toLowerCase() === toEmailAddr.toLowerCase()) {
          clientId = c.id;
          break;
        }
      }
    }

    // fromEmail is the connected Graph API email address or the fallback DB users.email
    await db.insert(outlookEmails).values({
      outlookId,
      conversationId,
      subject: scheduledEmail.subject,
      snippet:
        scheduledEmail.bodyText?.slice(0, 200) ||
        scheduledEmail.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
      fromEmail,
      fromName,
      toEmails: [scheduledEmail.toEmail],
      bodyHtml: scheduledEmail.bodyHtml,
      bodyText: scheduledEmail.bodyText || null,
      isRead: true,
      isStarred: false,
      isArchived: false,
      isSent: true,
      sentAt: new Date(),
      clientId,
      userId,
    });

    await db
      .update(scheduledEmails)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  } catch (sendErr: unknown) {
    const errMsg = axios.isAxiosError(sendErr)
      ? ((sendErr.response?.data as { error?: { message?: string } })?.error
          ?.message ?? sendErr.message)
      : sendErr instanceof Error
        ? sendErr.message
        : "Send failed";
    console.error("[process_scheduled_emails]", scheduledEmailId, sendErr);
    await db
      .update(scheduledEmails)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  }
}
