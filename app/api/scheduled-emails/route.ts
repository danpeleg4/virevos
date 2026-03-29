import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { scheduledEmails } from "@db/schema";
import { and, eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(scheduledEmails)
      .where(eq(scheduledEmails.userId, user.id))
      .orderBy(asc(scheduledEmails.scheduledAt));

    return NextResponse.json({ scheduledEmails: rows });
  } catch (err) {
    console.error("[api/scheduled-emails GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch scheduled emails" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      toEmail,
      toName,
      subject,
      bodyHtml,
      bodyText,
      scheduledAt,
      timezone,
      recurring,
      clientId,
    } = body;

    if (!toEmail || !subject || !bodyHtml || !scheduledAt) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: toEmail, subject, bodyHtml, scheduledAt",
        },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);

    const [inserted] = await db
      .insert(scheduledEmails)
      .values({
        toEmail,
        toName: toName || null,
        subject,
        bodyHtml,
        bodyText: bodyText || null,
        scheduledAt: scheduledDate,
        timezone: timezone || "UTC",
        recurring: recurring || "none",
        status: "pending",
        clientId: clientId || null,
        userId: user.id,
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (err) {
    console.error("[api/scheduled-emails POST]", err);
    return NextResponse.json(
      { error: "Failed to create scheduled email" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, parseInt(id, 10)),
          eq(scheduledEmails.userId, user.id)
        )
      )
      .limit(1);

    if (!rows.length) {
      return NextResponse.json(
        { error: "Scheduled email not found" },
        { status: 404 }
      );
    }

    await db
      .delete(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.id, parseInt(id, 10)),
          eq(scheduledEmails.userId, user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/scheduled-emails DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete scheduled email" },
      { status: 500 }
    );
  }
}
