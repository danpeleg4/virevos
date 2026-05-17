import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { outlookEmails } from "@db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/auth";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const clientId = Number(id);
    if (Number.isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: outlookEmails.id,
        subject: outlookEmails.subject,
        snippet: outlookEmails.snippet,
        fromEmail: outlookEmails.fromEmail,
        fromName: outlookEmails.fromName,
        toEmails: outlookEmails.toEmails,
        isRead: outlookEmails.isRead,
        isSent: outlookEmails.isSent,
        hasAttachments: outlookEmails.hasAttachments,
        sentAt: outlookEmails.sentAt,
      })
      .from(outlookEmails)
      .where(
        and(
          eq(outlookEmails.clientId, clientId),
          eq(outlookEmails.userId, user.id)
        )
      )
      .orderBy(desc(outlookEmails.sentAt))
      .limit(50);

    return NextResponse.json({ emails: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
