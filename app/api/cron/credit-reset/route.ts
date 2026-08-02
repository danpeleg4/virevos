import { NextResponse } from "next/server";
import { resetDueAiCredits } from "@/lib/plan_limits";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reset } = await resetDueAiCredits(planLimitsDrizzle);

    return NextResponse.json({ reset });
  } catch (err) {
    console.error("[cron/credit-reset]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
