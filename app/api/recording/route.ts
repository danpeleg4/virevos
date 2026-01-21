import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { currentUser } from "@clerk/nextjs/server";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_S3_READER_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_S3_READER_SECRET_KEY!,
    },
});

export async function POST(req: NextRequest) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { meetingId } = await req.json();

    if (!meetingId) {
        return NextResponse.json({ error: "Meeting ID required" }, { status: 400 });
    }

    const folderPrefix = `recordings/${user.id}/${meetingId}/`;

    try {
        // List all objects in the folder
        const listResponse = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: process.env.AWS_BUCKET_NAME!,
                Prefix: folderPrefix,
            })
        );

        if (!listResponse.Contents || listResponse.Contents.length === 0) {
            return NextResponse.json({ error: "No files found" }, { status: 404 });
        }

        // Find video and audio by extension
        const videoFile = listResponse.Contents.find((obj) => obj.Key?.endsWith(".webm"));
        const audioFile = listResponse.Contents.find((obj) => obj.Key?.endsWith(".ogg"));

        if (!videoFile && !audioFile) {
            return NextResponse.json({ error: "No video or audio files found" }, { status: 404 });
        }

        // Generate signed URLs
        const videoUrl = videoFile
            ? await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME!,
                    Key: videoFile.Key!,
                }),
                { expiresIn: 3600 }
            )
            : null;

        const audioUrl = audioFile
            ? await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME!,
                    Key: audioFile.Key!,
                }),
                { expiresIn: 3600 }
            )
            : null;

        return NextResponse.json({ videoUrl, audioUrl });
    } catch (err) {
        console.error("S3 error:", err);
        return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
    }
}
