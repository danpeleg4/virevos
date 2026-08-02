import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createInstantMeeting } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/classes/meetings_db";
import { ValidationError } from "@/lib/util/validation";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await createInstantMeeting(body.title, meetingsDrizzle);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/meetings POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }
}
