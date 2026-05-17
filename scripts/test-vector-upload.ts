import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

config({ path: ".env.local" });

if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket: unknown }).WebSocket = class {
    constructor() {
      throw new Error("WebSocket is not used by this script");
    }
  };
}

const TRANSCRIPT_BUCKET = "recording";
const TRANSCRIPT_INDEX = "transcription";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_API_SECRET!
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const index = supabase.storage.vectors
    .from(TRANSCRIPT_BUCKET)
    .index(TRANSCRIPT_INDEX);

  console.log("Generating embedding for test text...");
  const embRes = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: "Hello from the diagnostic script.",
  });
  const embedding = embRes.data[0].embedding;
  console.log(`embedding dimension: ${embedding.length}`);

  console.log("Putting vector...");
  const key = `diag-${Date.now()}`;
  const putRes = await index.putVectors({
    vectors: [
      {
        key,
        data: { float32: embedding },
        metadata: {
          chunk_text: "Hello from the diagnostic script.",
          speaker: "diag1",
          room: "diag-room1",
          user_id: "diag-user1",
          started_epoch: new Date(),
        },
      },
    ],
  });
  console.log("putVectors response:", JSON.stringify(putRes, null, 2));

  console.log("Listing vectors in index...");
  const listRes = await index.listVectors();
  console.log("listVectors response:", JSON.stringify(listRes, null, 2));

  console.log("Querying for similar vectors...");
  const queryRes = await index.queryVectors({
    queryVector: { float32: embedding },
    topK: 5,
    filter: { user_id: "diag-user1" },
    returnMetadata: true,
  });
  console.log("queryVectors response:", JSON.stringify(queryRes, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
