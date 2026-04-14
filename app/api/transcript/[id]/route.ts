import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin, TRANSCRIPTS_BUCKET } from "@/lib/supabase";
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

  const folderPrefix = `${user.id}/${id}`;

  try {
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(TRANSCRIPTS_BUCKET)
      .list(folderPrefix);

    if (listError || !files || files.length === 0) {
      return NextResponse.json(
        { error: "No files found in folder" },
        { status: 404 }
      );
    }

    const jsonFiles = files.filter((f) => f.name.endsWith(".json"));

    if (jsonFiles.length === 0) {
      return NextResponse.json(
        { error: "No JSON files found" },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      jsonFiles.map(async (file) => {
        const { data, error } = await supabaseAdmin.storage
          .from(TRANSCRIPTS_BUCKET)
          .download(`${folderPrefix}/${file.name}`);

        if (error || !data) {
          throw new Error(`Failed to download ${file.name}: ${error?.message}`);
        }

        const text = await data.text();
        return JSON.parse(text);
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Storage error:", error);
    return NextResponse.json(
      { error: "Failed to fetch JSON files" },
      { status: 500 }
    );
  }
}
