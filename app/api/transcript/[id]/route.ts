import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getTranscript } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/meetings_db";
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
    const result = await getTranscript(id, meetingsDrizzle);
    if (!result || result.chunks.length === 0) {
      return NextResponse.json(
        { error: "No transcript found" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}
