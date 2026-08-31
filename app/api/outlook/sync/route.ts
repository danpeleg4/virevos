import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  listOutlookEmails,
  syncOutlookInbox,
} from "@/lib/outlook/outlook_actions";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { openAIClient } from "@/api_client/openai_client";
import { ValidationError } from "@/lib/util/validation";

/**
 * GET /api/outlook/sync
 *
 * Returns the current user's previously-synced Outlook emails from the local
 * `outlookEmails` table (this does NOT call Microsoft Graph — it reads the
 * cached copy populated by the sync job).
 *
 * Query params:
 *   - page   (default 1)   1-based page number for pagination.
 *   - limit  (default 50)  Page size; one extra row is fetched to compute `hasMore`.
 *   - search (default "")  Case-insensitive match against from name/email, subject, and snippet.
 *   - filter (default "all") One of "all" | "unread" | "starred" | "sent" | "archived".
 *
 * Response: { messages, page, limit, hasMore }
 * Errors: 401 if unauthenticated, 500 on failure.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const filter = (searchParams.get("filter") || "all") as
      "all" | "unread" | "starred" | "sent" | "archived";

    const result = await listOutlookEmails(
      user.id,
      { page, limit, search, filter },
      outlookDrizzle
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/outlook/sync GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

/** POST /api/outlook/sync — triggers an on-demand incremental sync from Graph. */
export async function POST() {
  try {
    const result = await syncOutlookInbox(
      outlookDrizzle,
      calendarDrizzle,
      graphAuthService,
      graphMailService,
      supabaseStorageClient,
      openAIClient
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/outlook/sync POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
