import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { googleEmails, clients } from "@db/schema";
import { eq, desc, or, ilike, and, SQL } from "drizzle-orm";
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

    const conditions: SQL[] = [eq(googleEmails.userId, user.id)];

    if (search) {
      conditions.push(
        or(
          ilike(googleEmails.fromName, `%${search}%`),
          ilike(googleEmails.fromEmail, `%${search}%`),
          ilike(googleEmails.subject, `%${search}%`),
          ilike(googleEmails.snippet, `%${search}%`)
        ) as SQL
      );
    }

    if (filter === "unread") conditions.push(eq(googleEmails.isRead, false));
    else if (filter === "starred") conditions.push(eq(googleEmails.isStarred, true));
    else if (filter === "sent") conditions.push(eq(googleEmails.isSent, true));
    else if (filter === "archived") conditions.push(eq(googleEmails.isArchived, true));

    const rows = await db
      .select({
        id: googleEmails.id,
        gmailId: googleEmails.gmailId,
        threadId: googleEmails.threadId,
        subject: googleEmails.subject,
        snippet: googleEmails.snippet,
        fromEmail: googleEmails.fromEmail,
        fromName: googleEmails.fromName,
        toEmails: googleEmails.toEmails,
        bodyHtml: googleEmails.bodyHtml,
        bodyText: googleEmails.bodyText,
        labelIds: googleEmails.labelIds,
        isRead: googleEmails.isRead,
        isStarred: googleEmails.isStarred,
        isArchived: googleEmails.isArchived,
        isSent: googleEmails.isSent,
        sentAt: googleEmails.sentAt,
        clientId: googleEmails.clientId,
        clientName: clients.name,
      })
      .from(googleEmails)
      .leftJoin(clients, eq(googleEmails.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(googleEmails.sentAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const messages = pageRows.map((email) => ({
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

    return NextResponse.json({ messages, page, limit, hasMore });
  } catch (err) {
    console.error("[api/gmail/sync GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
