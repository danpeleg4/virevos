import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getRecordingUrl } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/meetings_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid meetingId" }, { status: 400 });
  }

  try {
    const result = await getRecordingUrl(
      id,
      meetingsDrizzle,
      supabaseStorageClient
    );
    if (!result) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Storage error:", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
}
