import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSignedUrl } from "@/lib/storage";
import { supabaseAdmin, RECORDINGS_BUCKET } from "@/lib/supabase";
import { db } from "@db/db";
import { events } from "@db/schema";
import { and, eq } from "drizzle-orm";

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

  const [meeting] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, user.id)));

  if (!meeting) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const prefix = `recordings/${user.id}/${id}`;

  try {
    const { data: topLevel, error: listError } = await supabaseAdmin.storage
      .from(RECORDINGS_BUCKET)
      .list(prefix, { limit: 100 });

    if (listError) throw new Error(listError.message);

    const participantFolders = (topLevel ?? []).filter(
      (f) => !f.name.includes(".")
    );

    if (participantFolders.length === 0) {
      return NextResponse.json(
        { error: "No recordings found" },
        { status: 404 }
      );
    }

    const videos = await Promise.all(
      participantFolders.map(async (folder) => {
        const { data: files } = await supabaseAdmin.storage
          .from(RECORDINGS_BUCKET)
          .list(`${prefix}/${folder.name}`);

        const mp4 = (files ?? []).find((f) => f.name.endsWith(".mp4"));
        if (!mp4) return null;

        const url = await getSignedUrl(
          RECORDINGS_BUCKET,
          `${prefix}/${folder.name}/${mp4.name}`,
          3600
        );
        return { participant: folder.name, url };
      })
    );

    const result = videos.filter(
      (v): v is { participant: string; url: string } => v !== null
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "No recordings found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ videos: result });
  } catch (err) {
    console.error("Storage error:", err);
    return NextResponse.json(
      { error: "Recordings not found" },
      { status: 404 }
    );
  }
}
