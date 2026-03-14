import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_FILES_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_S3_FILES_SECRET_KEY!,
  },
});

export const S3_BUCKET = "virevos-project-files";
