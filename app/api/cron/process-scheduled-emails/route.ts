import { NextResponse } from "next/server";
import { db, Drizzle, DrizzleInstance } from "@db/db";
import { scheduledEmails } from "@db/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendScheduledEmail } from "@/lib/scheduled_emails";

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dueEmails = await db
      .select({ id: scheduledEmails.id })
      .from(scheduledEmails)
      .where(
        and(
          eq(scheduledEmails.status, "pending"),
          lte(scheduledEmails.scheduledAt, new Date())
        )
      );

    const results = await Promise.allSettled(
      dueEmails.map((e) => sendScheduledEmail(e.id, DrizzleInstance))
    );
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(
          "[cron/process-scheduled-emails] failed for id",
          dueEmails[i].id,
          r.reason
        );
      }
    });

    return NextResponse.json({ processed: dueEmails.length });
  } catch (err) {
    console.error("[cron/process-scheduled-emails]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
