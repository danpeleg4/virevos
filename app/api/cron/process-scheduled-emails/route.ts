import { NextResponse } from "next/server";
import { scheduledEmailsDrizzle } from "@db/scheduled_emails_db";
import { processDueScheduledEmails } from "@/lib/scheduled_emails";
import { scheduledEmailService } from "@/api_client/ms_graph/scheduled_email_service";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";

/**
 * Handles a GET request to process due scheduled emails.
 *
 * @param {Request} req - The incoming HTTP request object containing headers and other request data.
 * @return {Promise<Response>} A JSON response indicating the result of the processing.
 * Returns a 401 status and error message if unauthorized, a 500 status and error message if
 * a processing error occurs, or a successful processed count if the operation completes successfully.
 */
export async function GET(req: Request): Promise<Response> {
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
