import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, clients, emails, users } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { getGmailClient, buildRawEmail } from "@/lib/gmail_client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Find portal token
    const tokenRows = await db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);

    if (!tokenRows.length || !tokenRows[0].enabled) {
      return NextResponse.json({ error: "Portal not found or disabled" }, { status: 404 });
    }

    const portalToken = tokenRows[0];
    const userId = portalToken.userId;

    // Fetch client info
    const clientRows = await db
      .select()
      .from(clients)
      .where(eq(clients.id, portalToken.clientId))
      .limit(1);

    if (!clientRows.length) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientRows[0];

    // Get agency user Gmail
    const gmail = await getGmailClient(userId);
    if (!gmail) {
      // Still save the message even if Gmail is not connected
      await db.insert(emails).values({
        gmailId: `portal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        threadId: `portal-thread-${Date.now()}`,
        subject: `Portal message from ${client.name}`,
        snippet: message.slice(0, 200),
        fromEmail: client.email || "portal@noreply",
        fromName: client.name,
        toEmails: [],
        bodyText: message,
        bodyHtml: `<p>${message.replace(/\n/g, "<br>")}</p>`,
        labelIds: ["INBOX"],
        isRead: false,
        isStarred: false,
        isArchived: false,
        isSent: false,
        sentAt: new Date(),
        clientId: client.id,
        userId,
      });
      return NextResponse.json({ success: true });
    }

    const profileRes = await gmail.users.getProfile({ userId: "me" });
    const agencyEmail = profileRes.data.emailAddress || "";

    const userRows = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.user_id, userId))
      .limit(1);
    const agencyName = userRows[0]?.name || "Agency";

    const subject = `Portal message from ${client.name}`;
    const bodyHtml = `<p><strong>Message from ${client.name} via Client Portal:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>`;
    const bodyText = `Message from ${client.name} via Client Portal:\n\n${message}`;

    const rawEmail = buildRawEmail({
      to: agencyEmail,
      from: agencyEmail,
      fromName: agencyName,
      subject,
      bodyHtml,
      bodyText,
    });

    let gmailId = `portal-${Date.now()}`;
    let threadId = `portal-thread-${Date.now()}`;

    try {
      const sendRes = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: rawEmail },
      });
      gmailId = sendRes.data.id || gmailId;
      threadId = sendRes.data.threadId || threadId;
    } catch (sendErr) {
      console.error("[portal/message] Gmail send error:", sendErr);
      // Continue to save to DB regardless
    }

    // Save to emails DB with clientId set
    await db.insert(emails).values({
      gmailId,
      threadId,
      subject,
      snippet: message.slice(0, 200),
      fromEmail: client.email || "portal@noreply",
      fromName: client.name,
      toEmails: [agencyEmail],
      bodyText,
      bodyHtml,
      labelIds: ["INBOX"],
      isRead: false,
      isStarred: false,
      isArchived: false,
      isSent: false,
      sentAt: new Date(),
      clientId: client.id,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/portal/[token]/message POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
