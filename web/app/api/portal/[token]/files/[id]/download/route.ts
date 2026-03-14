import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { clientPortalTokens, projectFiles, projects } from "@db/schema";
import { eq } from "drizzle-orm";
import { s3, S3_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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
    .from(projectFiles)
    .where(eq(projectFiles.id, fileId))
    .limit(1);

  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Verify the file belongs to a project owned by this portal's client
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, file.projectId))
    .limit(1);

  if (!project || project.clientId == null || project.clientId !== portalToken.clientId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: Uint8Array;
  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: file.path })
    );
    if (!result.Body) {
      return new NextResponse("Download failed", { status: 500 });
    }
    body = await result.Body.transformToByteArray();
  } catch {
    return new NextResponse("Download failed", { status: 500 });
  }

  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Content-Length": body.byteLength.toString(),
    },
  });
}
