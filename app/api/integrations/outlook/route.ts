import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  disconnectOutlook,
  getOutlookConnectionStatus,
} from "@/lib/integrations";
import { integrationsDrizzle } from "@db/classes/integrations_db";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await getOutlookConnectionStatus(integrationsDrizzle);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/integrations/outlook GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch integration status" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await disconnectOutlook(
      integrationsDrizzle,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/integrations/outlook DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to disconnect Outlook" },
      { status: 500 }
    );
  }
}
