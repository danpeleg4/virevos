import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { scheduledEmails, emails, googleTokens, users, clients } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { getGmailClient, buildRawEmail, parseEmailAddress } from "@/lib/gmail_client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scheduledEmailId, secret } = body;

    // Verify secret
    const expectedSecret = process.env.WEBHOOK_SECRET || "virevos-scheduled-email";
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!scheduledEmailId) {
      return NextResponse.json({ error: "Missing scheduledEmailId" }, { status: 400 });
    }

    // Fetch the scheduled email
    const rows = await db
      .select()
      .from(scheduledEmails)
      .where(eq(scheduledEmails.id, scheduledEmailId))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ error: "Scheduled email not found" }, { status: 404 });
    }

    const scheduledEmail = rows[0];

    if (scheduledEmail.status !== "pending") {
      return NextResponse.json({ error: "Email already processed" }, { status: 409 });
    }

    const userId = scheduledEmail.userId;

    // Get Gmail client
    const gmail = await getGmailClient(userId);
    if (!gmail) {
      await db
        .update(scheduledEmails)
        .set({ status: "failed", errorMessage: "Gmail not connected for user" })
        .where(eq(scheduledEmails.id, scheduledEmailId));
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    // Get sender email
    const profileRes = await gmail.users.getProfile({ userId: "me" });
    const fromEmail = profileRes.data.emailAddress || "";

    // Get user info
    const userRows = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.user_id, userId))
      .limit(1);
    const fromName = userRows[0]?.name || "";

    // Build and send email
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

      // Try to match client
      let clientId: number | null = scheduledEmail.clientId;
      if (!clientId) {
        const toEmailAddr = parseEmailAddress(scheduledEmail.toEmail).email || scheduledEmail.toEmail;
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

      // Save sent email to DB
      await db.insert(emails).values({
        gmailId,
        threadId,
        subject: scheduledEmail.subject,
        snippet: scheduledEmail.bodyText?.slice(0, 200) || scheduledEmail.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
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

      // Mark scheduled email as sent
      await db
        .update(scheduledEmails)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(scheduledEmails.id, scheduledEmailId));

      return NextResponse.json({ success: true, gmailId });
    } catch (sendErr: any) {
      const errMsg = sendErr?.message || "Send failed";
      await db
        .update(scheduledEmails)
        .set({ status: "failed", errorMessage: errMsg })
        .where(eq(scheduledEmails.id, scheduledEmailId));
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
  } catch (err) {
    console.error("[api/webhooks/scheduled-email POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
