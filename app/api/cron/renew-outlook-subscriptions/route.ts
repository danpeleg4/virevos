import { NextResponse } from "next/server";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { renewSubscriptions } from "@/lib/outlook/outlook_sync";

export async function GET(req: Request) {
  const authHeader = req.headers
    ? new Headers(req.headers).get("authorization")
    : null;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Renew subscriptions expiring within the next 24 hours
  const threshold = Date.now() + 24 * 60 * 60 * 1000;

  const rows = await outlookDrizzle.getExpiringSyncStates(threshold);

  await Promise.allSettled(
    rows.map((r) =>
      renewSubscriptions(
        r.userId,
        outlookDrizzle,
        graphAuthService,
        graphMailService
      )
    )
  );

  return NextResponse.json({ renewed: rows.length });
}
