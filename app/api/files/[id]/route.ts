import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { caseFiles } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { downloadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase/supabase";

const downloadType = async (fileId: number, userId: string) => {
  const [file] = await db
    .select()
    .from(caseFiles)
    .where(and(eq(caseFiles.id, fileId), eq(caseFiles.userId, userId)));

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
};

const getFilesType = async (fileId: number, userId: string) => {
  const caseId = fileId;
  const files = await db
    .select()
    .from(caseFiles)
    .where(and(eq(caseFiles.caseId, caseId), eq(caseFiles.userId, userId)));
  return NextResponse.json(files);
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const fileId = Number(id);

  if (Number.isNaN(fileId)) {
    return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
  }

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type");
  if (type == "download") return await downloadType(fileId, user.id);
  if (type == "get-files") return await getFilesType(fileId, user.id);

  return NextResponse.json({ error: "No type found" }, { status: 400 });
}
