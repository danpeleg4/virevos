import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { emails, clients } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { performGmailSync } from "@/lib/gmail_sync";

export async function POST() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await performGmailSync(user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/gmail/sync POST]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // all | unread | starred | sent | archived
    const offset = (page - 1) * limit;

    const query = db
      .select({
        id: emails.id,
        gmailId: emails.gmailId,
        threadId: emails.threadId,
        subject: emails.subject,
        snippet: emails.snippet,
        fromEmail: emails.fromEmail,
        fromName: emails.fromName,
        toEmails: emails.toEmails,
        bodyHtml: emails.bodyHtml,
        bodyText: emails.bodyText,
        labelIds: emails.labelIds,
        isRead: emails.isRead,
        isStarred: emails.isStarred,
        isArchived: emails.isArchived,
        isSent: emails.isSent,
        sentAt: emails.sentAt,
        clientId: emails.clientId,
        clientName: clients.name,
      })
      .from(emails)
      .leftJoin(clients, eq(emails.clientId, clients.id))
      .where(eq(emails.userId, user.id))
      .orderBy(desc(emails.sentAt))
      .limit(limit)
      .offset(offset);

    const rows = await query;

    const messages = rows.map((email) => ({
      id: String(email.id),
      gmailId: email.gmailId,
      threadId: email.threadId,
      type: "email" as const,
      from: email.fromName || email.fromEmail || "Unknown",
      fromEmail: email.fromEmail,
      initials:
        (email.fromName || email.fromEmail || "?")
          .split(" ")
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase() || "")
          .join("") || "?",
      subject: email.subject,
      preview: email.snippet || (email.bodyText?.slice(0, 150) ?? ""),
      body: email.bodyHtml || email.bodyText,
      timestamp: email.sentAt,
      unread: !email.isRead,
      starred: email.isStarred ?? false,
      archived: email.isArchived ?? false,
      sent: email.isSent ?? false,
      client: email.clientName || "",
      clientId: email.clientId,
      labels: email.labelIds ?? [],
      tags: [] as string[],
    }));

    // Filter client-side for simplicity (search and filter are on small result sets)
    let filtered = messages;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.from.toLowerCase().includes(q) ||
          (m.subject || "").toLowerCase().includes(q) ||
          m.preview.toLowerCase().includes(q)
      );
    }
    if (filter === "unread") filtered = filtered.filter((m) => m.unread);
    if (filter === "starred") filtered = filtered.filter((m) => m.starred);
    if (filter === "sent") filtered = filtered.filter((m) => m.sent);
    if (filter === "archived") filtered = filtered.filter((m) => m.archived);

    return NextResponse.json({ messages: filtered, page, limit });
  } catch (err) {
    console.error("[api/gmail/sync GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
