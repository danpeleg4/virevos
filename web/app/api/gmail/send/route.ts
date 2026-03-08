import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { emails, clients } from "@db/schema";
import { eq } from "drizzle-orm";
import { getGmailClient, buildRawEmail, parseEmailAddress } from "@/lib/gmail_client";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { to, toName, subject, bodyHtml, bodyText, replyToGmailId, threadId } = body;

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, bodyHtml" },
        { status: 400 }
      );
    }

    const gmail = await getGmailClient(user.id);
    if (!gmail) {
      return NextResponse.json(
        { error: "Gmail not connected. Please connect your Google account." },
        { status: 400 }
      );
    }

    // Get user's Gmail address
    const profileRes = await gmail.users.getProfile({ userId: "me" });
    const fromEmail = profileRes.data.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
    const fromName = user.fullName || "";

    const rawEmail = buildRawEmail({
      to,
      toName,
      from: fromEmail,
      fromName,
      subject,
      bodyHtml,
      bodyText,
    });

    const sendParams: any = {
      userId: "me",
      requestBody: { raw: rawEmail },
    };
    if (threadId) {
      sendParams.requestBody.threadId = threadId;
    }

    const sendRes = await gmail.users.messages.send(sendParams);
    const gmailId = sendRes.data.id!;
    const sentThreadId = sendRes.data.threadId!;

    // Try to match recipient to a client
    let clientId: number | null = null;
    const toEmailAddr = parseEmailAddress(to).email || to;
    const clientRows = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .limit(100);

    // Simple email match
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

    // Save sent email to DB
    await db.insert(emails).values({
      gmailId,
      threadId: sentThreadId,
      subject,
      snippet: bodyText?.slice(0, 200) || bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
      fromEmail,
      fromName,
      toEmails: [toEmailAddr],
      bodyHtml,
      bodyText: bodyText || null,
      labelIds: ["SENT"],
      isRead: true,
      isStarred: false,
      isArchived: false,
      isSent: true,
      sentAt: new Date(),
      clientId,
      userId: user.id,
    });

    return NextResponse.json({ success: true, gmailId });
  } catch (err) {
    console.error("[api/gmail/send POST]", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
