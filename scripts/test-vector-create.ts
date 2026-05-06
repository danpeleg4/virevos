import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket: unknown }).WebSocket = class {
    constructor() {
      throw new Error("WebSocket is not used by this script");
    }
  };
}

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_API_SECRET!
  );

  //await supabase.storage.vectors.createBucket("test");
  const bucket = supabase.storage.vectors.from("test");
  await bucket.createIndex({
    indexName: "transcription",
    dataType: "float32",
    dimension: 3072,
    distanceMetric: "cosine",
    metadataConfiguration: {
      nonFilterableMetadataKeys: [
        "chunk_text",
        "speaker",
        "room",
        "user_id",
        "started_epoch",
      ],
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
