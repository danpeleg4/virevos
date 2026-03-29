import { NextResponse } from "next/server";
import { db } from "@db/db";
import { scheduledEmails, emails, users, clients, googleTokens } from "@db/schema";
import { eq, and, lte } from "drizzle-orm";
import { google } from "googleapis";

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw?.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: "", email: raw?.trim() ?? "" };
}

function buildRawEmail({
  to,
  toName,
  from,
  fromName,
  subject,
  bodyHtml,
  bodyText,
}: {
  to: string;
  toName?: string;
  from: string;
  fromName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}): string {
  const boundary = `alt_${Date.now()}`;
  const toHeader = toName ? `"${toName}" <${to}>` : to;
  const fromHeader = fromName ? `"${fromName}" <${from}>` : from;
  const message = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    bodyText || bodyHtml.replace(/<[^>]*>/g, ""),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    bodyHtml,
    ``,
    `--${boundary}--`,
  ].join("\r\n");
  return Buffer.from(message).toString("base64url");
}

async function getFreshAccessToken(userId: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, userId))
    .limit(1);

  if (!rows.length) return null;

  const tokenData = rows[0];
  const now = Date.now();

  if (tokenData.expires_in && tokenData.expires_in > now + 30000) {
    return tokenData.access_token;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: tokenData.refresh_token });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const updateData: {
      access_token?: string;
      expires_in: number;
      connected: boolean;
      refresh_token?: string;
    } = {
      access_token: credentials.access_token ?? undefined,
      expires_in: credentials.expiry_date as number,
      connected: true,
    };
    if (credentials.refresh_token) updateData.refresh_token = credentials.refresh_token;
    await db.update(googleTokens).set(updateData).where(eq(googleTokens.userId, userId));
    return credentials.access_token ?? null;
  } catch (err) {
    console.error("Token refresh error:", err);
    return null;
  }
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
  const accessToken = await getFreshAccessToken(userId);

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
