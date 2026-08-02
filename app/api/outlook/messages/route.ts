import { NextResponse } from "next/server";
import { sendOutlookEmail } from "@/lib/outlook/outlook_actions";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await sendOutlookEmail(
      body,
      outlookDrizzle,
      supabaseStorageClient,
      graphAuthService,
      graphMailService
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/outlook/messages POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
