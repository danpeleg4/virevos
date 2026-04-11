import { NextResponse } from "next/server";
import { db } from "@db/db";
import { scheduledEmails, emails, users, clients, googleTokens } from "@db/schema";
import { eq, and, lte } from "drizzle-orm";
import { google } from "googleapis";
import {getFreshGoogleAccessToken} from "@/lib/google_access";
import {buildRawEmail} from "@/lib/gmail_client";

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw?.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
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
  const accessToken = await getFreshGoogleAccessToken(userId);

  if (!accessToken) {
    await db
      .update(scheduledEmails)
      .set({ status: "failed", errorMessage: "Gmail not connected for user" })
      .where(eq(scheduledEmails.id, scheduledEmailId));
    return;
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const profileRes = await gmail.users.getProfile({ userId: "me" });
  const fromEmail = profileRes.data.emailAddress || "";

  const userRows = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.user_id, userId))
    .limit(1);
  const fromName = userRows[0]?.name || "";

  const rawEmail = buildRawEmail({
    to: scheduledEmail.toEmail,
    toName: scheduledEmail.toName || undefined,
    from: fromEmail,
    fromName,
    subject: scheduledEmail.subject,
    bodyHtml: scheduledEmail.bodyHtml,
    bodyText: scheduledEmail.bodyText || undefined,
  });

  try {
    const sendRes = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawEmail },
    });

    const gmailId = sendRes.data.id!;
    const threadId = sendRes.data.threadId!;

    let clientId: number | null = scheduledEmail.clientId;
    if (!clientId) {
      const toEmailAddr =
        parseEmailAddress(scheduledEmail.toEmail).email || scheduledEmail.toEmail;
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

    await db.insert(emails).values({
      gmailId,
      threadId,
      subject: scheduledEmail.subject,
      snippet:
        scheduledEmail.bodyText?.slice(0, 200) ||
        scheduledEmail.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
      fromEmail,
      fromName,
      toEmails: [scheduledEmail.toEmail],
      bodyHtml: scheduledEmail.bodyHtml,
      bodyText: scheduledEmail.bodyText || null,
      labelIds: ["SENT"],
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
  const authHeader = req.headers ? new Headers(req.headers).get("authorization") : null;
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