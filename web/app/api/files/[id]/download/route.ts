import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { projectFiles } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { s3, S3_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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
    .from(projectFiles)
    .where(and(eq(projectFiles.id, fileId), eq(projectFiles.userId, user.id)));

  if (!file) {
    return new NextResponse("Not found", { status: 404 });
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
