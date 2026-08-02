import { NextRequest, NextResponse } from "next/server";
import { createDemoRequest } from "@/lib/demo_requests";
import { demoRequestsDrizzle } from "@db/classes/demo_requests_db";
import { resendApiClient } from "@/api_client/resend_client";
import { ValidationError } from "@/lib/util/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createDemoRequest(
      body,
      demoRequestsDrizzle,
      resendApiClient
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/demo-requests POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to submit demo request" },
      { status: 500 }
    );
  }
}
