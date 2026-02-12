import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { currentUser } from "@clerk/nextjs/server";
import { Readable } from "stream";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_READER_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_S3_READER_SECRET_KEY!,
  },
});

async function streamToString(stream: Readable | undefined): Promise<string> {
  if (!stream) throw new Error("No stream provided");

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export async function POST(req: NextRequest) {
  const { meetingId } = await req.json();
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const folderPrefix = `${user.id}/${meetingId}/`;

  try {
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: "vire-json",
        Prefix: folderPrefix,
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return NextResponse.json(
        { error: "No files found in folder" },
        { status: 404 }
      );
    }

    const jsonFiles = listResponse.Contents.filter(
      (obj) => obj.Key && obj.Key.endsWith(".json")
    );

    if (jsonFiles.length === 0) {
      return NextResponse.json(
        { error: "No JSON files found" },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      jsonFiles.map(async (file) => {
        const response = await s3.send(
          new GetObjectCommand({
            Bucket: "vire-json",
            Key: file.Key!,
          })
        );

        if (!response.Body) {
          throw new Error(`S3 file ${file.Key} has no body`);
        }

        // Convert Node stream to string
        const bodyString = await streamToString(response.Body as Readable);
        //console.log("Got JSON file:", file.Key, bodyString);
        return JSON.parse(bodyString);
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("S3 error:", error);
    return NextResponse.json(
      { error: "Failed to fetch JSON files from S3" },
      { status: 500 }
    );
  }
}
