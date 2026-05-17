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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_API_SECRET!
  );

  await supabase.storage.vectors.createBucket("recording");
  const bucket = supabase.storage.vectors.from("recording");
  const indexRes = await bucket.createIndex({
    indexName: "transcription",
    dataType: "float32",
    dimension: 3072,
    distanceMetric: "cosine",
  });
  console.log("createIndex:", JSON.stringify(indexRes, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
