import { NextResponse } from "next/server";
import { db } from "@db/db";
import { users } from "@db/schema";
import { or, isNull, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setDate(nextReset.getDate() + 30);

    const result = await db
      .update(users)
      .set({ aiCredits: 0, creditsResetAt: nextReset })
      .where(or(isNull(users.creditsResetAt), lte(users.creditsResetAt, now)))
      .returning({ id: users.userId });

    return NextResponse.json({ reset: result.length });
  } catch (err) {
    console.error("[cron/credit-reset]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
