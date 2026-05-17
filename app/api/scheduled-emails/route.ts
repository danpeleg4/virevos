import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { scheduledEmails } from "@db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
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
