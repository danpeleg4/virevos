import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, caseFiles, cases } from "@db/schema";
import { eq } from "drizzle-orm";
import { downloadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;
  const fileId = Number(id);

  // Validate portal token
  const [portalToken] = await db
    .select()
    .from(clientPortalTokens)
    .where(eq(clientPortalTokens.token, token))
    .limit(1);

  if (!portalToken?.enabled) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Fetch the file
  const [file] = await db
    .select()
    .from(caseFiles)
    .where(eq(caseFiles.id, fileId))
    .limit(1);

  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Verify the file belongs to a case owned by this portal's client
  const [project] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, file.caseId))
    .limit(1);

  if (
    !project ||
    project.clientId == null ||
    project.clientId !== portalToken.clientId
  ) {
    return new NextResponse("Forbidden", { status: 403 });
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

  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Content-Length": body.byteLength.toString(),
    },
  });
}
