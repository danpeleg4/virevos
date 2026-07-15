import { NextResponse } from "next/server";
import { scheduledEmailsDrizzle } from "@db/scheduled_emails_db";
import { processDueScheduledEmails } from "@/lib/scheduled_emails";
import { scheduledEmailService } from "@/api_client/ms_graph/scheduled_email_service";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { processed } = await processDueScheduledEmails(
      scheduledEmailsDrizzle,
      scheduledEmailService,
      outlookDrizzle,
      graphAuthService
    );

    return NextResponse.json({ processed });
  } catch (err) {
    console.error("[cron/process-scheduled-emails]", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
