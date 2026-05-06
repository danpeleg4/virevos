import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { caseFiles } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { downloadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const fileId = Number(id);

  const [file] = await db
    .select()
    .from(caseFiles)
    .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, user.id)));

  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  let body: Uint8Array;
  try {
    body = await downloadFile(FILES_BUCKET, file.path);
  } catch {
    return new NextResponse("Download failed", { status: 500 });
  }

  const asciiFallback = file.name
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const utf8Encoded = encodeURIComponent(file.name);

  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`,
      "Content-Length": body.byteLength.toString(),
    },
  });
}
