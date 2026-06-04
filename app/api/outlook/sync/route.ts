import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { outlookEmails, clients } from "@db/schema";
import { eq, desc, or, ilike, and, SQL } from "drizzle-orm";

/**
 * GET /api/outlook/sync
 *
 * Returns the current user's previously-synced Outlook emails from the local
 * `outlookEmails` table (this does NOT call Microsoft Graph — it reads the
 * cached copy populated by the sync job). Results are joined with `clients` so
 * each message carries the linked client's name, then shaped into the message
 * format the inbox UI consumes.
 *
 * Query params:
 *   - page   (default 1)   1-based page number for pagination.
 *   - limit  (default 50)  Page size; one extra row is fetched to compute `hasMore`.
 *   - search (default "")  Case-insensitive match against from name/email, subject, and snippet.
 *   - filter (default "all") One of "all" | "unread" | "starred" | "sent" | "archived".
 *
 * Response: { messages, page, limit, hasMore }
 * Errors: 401 if unauthenticated, 500 on failure.
 */
export async function GET(req: NextRequest) {
  try {
    // Require an authenticated user; emails are scoped to their userId below.
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse pagination, search, and filter options from the query string.
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";
    const offset = (page - 1) * limit;

    // Always scope to the current user; further conditions are appended below.
    const conditions: SQL[] = [eq(outlookEmails.userId, user.id)];

    // Free-text search across sender and subject/snippet fields.
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

    // Mutually exclusive status filters ("all" applies no extra condition).
    if (filter === "unread") conditions.push(eq(outlookEmails.isRead, false));
    else if (filter === "starred")
      conditions.push(eq(outlookEmails.isStarred, true));
    else if (filter === "sent") conditions.push(eq(outlookEmails.isSent, true));
    else if (filter === "archived")
      conditions.push(eq(outlookEmails.isArchived, true));

    // Fetch one extra row (limit + 1) so we can tell if another page exists
    // without running a separate COUNT query.
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
        hasAttachments: outlookEmails.hasAttachments,
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

    // If we got the extra row back, there's a next page; trim it off the result.
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Map DB rows into the UI message shape (derive display name, initials,
    // preview text, and normalize nullable booleans to defaults).
    const messages = pageRows.map((email) => ({
      id: String(email.id),
      outlookId: email.outlookId,
      conversationId: email.conversationId,
      type: "email" as const,
      from: email.fromName || email.fromEmail || "Unknown",
      fromEmail: email.fromEmail,
      // Avatar initials: first letter of up to the first two name words.
      initials:
        (email.fromName || email.fromEmail || "?")
          .split(" ")
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase() || "")
          .join("") || "?",
      subject: email.subject,
      // Prefer the stored snippet; fall back to the start of the plain-text body.
      preview: email.snippet || (email.bodyText?.slice(0, 150) ?? ""),
      body: email.bodyHtml || email.bodyText,
      timestamp: email.sentAt,
      unread: !email.isRead,
      starred: email.isStarred ?? false,
      archived: email.isArchived ?? false,
      sent: email.isSent ?? false,
      hasAttachments: email.hasAttachments ?? false,
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
