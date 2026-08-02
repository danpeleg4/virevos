import { NextRequest, NextResponse } from "next/server";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { openAIClient } from "@/api_client/openai_client";
import { performIncrementalSync } from "@/lib/outlook/outlook_sync";

interface OutlookNotification {
  subscriptionId: string;
  clientState?: string;
  changeType: string;
  resource: string;
}

interface OutlookNotificationBody {
  value: OutlookNotification[];
}

// Microsoft Graph sends a validation POST before creating a subscription.
// Must respond with the validationToken as plain text within 10 seconds.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const validationToken = new URL(req.url).searchParams.get("validationToken");

  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  let body: OutlookNotificationBody;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const notifications = body.value ?? [];
  if (!notifications.length) {
    return new NextResponse(null, { status: 202 });
  }

  // Group notifications by subscriptionId to avoid duplicate syncs
  const processedUsers = new Set<string>();

  for (const notification of notifications) {
    const { subscriptionId, clientState } = notification;
    if (!subscriptionId) continue;

    // Look up user by subscription ID and validate clientState
    const syncStateRows =
      await outlookDrizzle.findSyncStateBySubscriptionId(subscriptionId);

    if (!syncStateRows.length) continue;

    const syncState = syncStateRows[0];

    if (clientState && syncState.clientState !== clientState) {
      console.warn(
        `[webhook/outlook] clientState mismatch for subscription ${subscriptionId}`
      );
      continue;
    }

    const userId = syncState.userId;
    if (processedUsers.has(userId)) continue;
    processedUsers.add(userId);

    try {
      await performIncrementalSync(
        userId,
        outlookDrizzle,
        calendarDrizzle,
        graphAuthService,
        graphMailService,
        supabaseStorageClient,
        openAIClient
      );
    } catch (err) {
      console.error(
        `[webhook/outlook] Incremental sync failed for ${userId}:`,
        err
      );
    }
  }

  return new NextResponse(null, { status: 202 });
}
