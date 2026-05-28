import { NextResponse } from "next/server";
import {
  listUsersWithWeeklySummary,
  sendWeeklySummary,
} from "@/lib/weekly_summary";

export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const targets = await listUsersWithWeeklySummary();
    const results = await Promise.allSettled(
      targets.map(async (t) => {
        const started = Date.now();
        try {
          const res = await sendWeeklySummary(t.userId);
          return res;
        } catch (err) {
          console.error(
            `[cron/weekly-summary] ✗ ${t.userId} failed in ${Date.now() - started}ms`,
            err
          );
          throw err;
        }
      })
    );

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const r of results) {
      if (r.status === "rejected") {
        failed += 1;
        continue;
      }
      if (r.value.skipped) skipped += 1;
      else sent += 1;
    }
    return NextResponse.json({
      total: targets.length,
      sent,
      skipped,
      failed,
    });
  } catch (err) {
    console.error("[cron/weekly-summary]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
