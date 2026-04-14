import { NextResponse } from "next/server";
import { db } from "@db/db";
import { events } from "@db/schema";
import { and, eq, lte, ne } from "drizzle-orm";

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await db
      .update(events)
      .set({ status: "active" })
      .where(
        and(
          eq(events.isMeeting, true),
          ne(events.status, "active"),
          ne(events.status, "ended"),
          lte(events.dateTime, new Date())
        )
      )
      .returning({ id: events.id });

    return NextResponse.json({ activated: result.length });
  } catch (err) {
    console.error("[cron/activate-meetings]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
