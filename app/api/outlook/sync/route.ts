import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { outlookEmails, clients } from "@db/schema";
import { eq, desc, or, ilike, and, SQL } from "drizzle-orm";
import { performIncrementalSync } from "@/lib/outlook_sync";

export async function POST() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await performIncrementalSync(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/outlook/sync POST]", err);
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

    const conditions: SQL[] = [eq(outlookEmails.userId, user.id)];

    if (search) {
      conditions.push(
        or(
          ilike(outlookEmails.fromName, `%${search}%`),
          ilike(outlookEmails.fromEmail, `%${search}%`),
          ilike(outlookEmails.subject, `%${search}%`),
          ilike(outlookEmails.snippet, `%${search}%`)
        ) as SQL
      );
    }

    if (filter === "unread") conditions.push(eq(outlookEmails.isRead, false));
    else if (filter === "starred")
      conditions.push(eq(outlookEmails.isStarred, true));
    else if (filter === "sent") conditions.push(eq(outlookEmails.isSent, true));
    else if (filter === "archived")
      conditions.push(eq(outlookEmails.isArchived, true));

    const rows = await db
      .select({
        id: outlookEmails.id,
        outlookId: outlookEmails.outlookId,
        conversationId: outlookEmails.conversationId,
        subject: outlookEmails.subject,
        snippet: outlookEmails.snippet,
        fromEmail: outlookEmails.fromEmail,
        fromName: outlookEmails.fromName,
        toEmails: outlookEmails.toEmails,
        bodyHtml: outlookEmails.bodyHtml,
        bodyText: outlookEmails.bodyText,
        isRead: outlookEmails.isRead,
        isStarred: outlookEmails.isStarred,
        isArchived: outlookEmails.isArchived,
        isSent: outlookEmails.isSent,
        sentAt: outlookEmails.sentAt,
        clientId: outlookEmails.clientId,
        clientName: clients.name,
      })
      .from(outlookEmails)
      .leftJoin(clients, eq(outlookEmails.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(outlookEmails.sentAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const messages = pageRows.map((email) => ({
      id: String(email.id),
      outlookId: email.outlookId,
      conversationId: email.conversationId,
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
    }));

    return NextResponse.json({ messages, page, limit, hasMore });
  } catch (err) {
    console.error("[api/outlook/sync GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
