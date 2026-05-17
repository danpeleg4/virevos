import { NextResponse } from "next/server";
import { db } from "@db/db";
import { scheduledEmails, outlookEmails, users, clients } from "@db/schema";
import { eq, and, lte } from "drizzle-orm";
import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook/outlook_access";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw?.match(/^(.*?)\s*<(.+?)>$/);
  if (match)
    return {
      name: match[1].trim().replace(/^"|"$/g, ""),
      email: match[2].trim(),
    };
  return { name: "", email: raw?.trim() ?? "" };
}

async function sendScheduledEmail(scheduledEmailId: number): Promise<void> {
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
  const accessToken = await getFreshOutlookAccessToken(userId);

  if (!accessToken) {
    await db
      .update(scheduledEmails)
      .set({ status: "failed", errorMessage: "Outlook not connected for user" })
      .where(eq(scheduledEmails.id, scheduledEmailId));
    return;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const profileRes = await axios.get<{
    mail?: string;
    userPrincipalName?: string;
  }>(`${GRAPH_BASE}/me`, { headers });
  const fromEmail =
    profileRes.data.mail || profileRes.data.userPrincipalName || "";

  const userRows = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.user_id, userId))
    .limit(1);
  const fromName = userRows[0]?.name || "";

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

  try {
    const draftRes = await axios.post<{ id: string; conversationId: string }>(
      `${GRAPH_BASE}/me/messages`,
      messagePayload,
      { headers }
    );
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
    const errMsg = sendErr instanceof Error ? sendErr.message : "Send failed";
    await db
      .update(scheduledEmails)
      .set({ status: "failed", errorMessage: errMsg })
      .where(eq(scheduledEmails.id, scheduledEmailId));
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dueEmails = await db
      .select({ id: scheduledEmails.id })
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.status, "pending"),
          lte(scheduledEmails.scheduledAt, new Date())
        )
      );

    await Promise.allSettled(dueEmails.map((e) => sendScheduledEmail(e.id)));

    return NextResponse.json({ processed: dueEmails.length });
  } catch (err) {
    console.error("[cron/process-scheduled-emails]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
