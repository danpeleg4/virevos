import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { currentUser } from "@clerk/nextjs/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_READER_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_S3_READER_SECRET_KEY!,
  },
});

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

  const key = `recordings/${user.id}/${id}/main.mp4`;

  try {
    const url = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
      }),
      { expiresIn: 3600 }
    );

    return NextResponse.json({ url });
  } catch (err) {
    console.error("S3 error:", err);
    return NextResponse.json({ error: "main.mp4 not found" }, { status: 404 });
  }
}
