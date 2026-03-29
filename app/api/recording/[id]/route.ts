import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSignedUrl } from "@/lib/storage";
import { RECORDINGS_BUCKET } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid meetingId" }, { status: 400 });
  }

  const path = `recordings/${user.id}/${id}/main.mp4`;

  try {
    const url = await getSignedUrl(RECORDINGS_BUCKET, path, 3600);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Storage error:", err);
    return NextResponse.json({ error: "main.mp4 not found" }, { status: 404 });
  }
}
