import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { config } from "dotenv";

/**
 * Need to put a user_id as command line argument
 *
 */

config({ path: ".env.local" });

if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket: unknown }).WebSocket = class {
    constructor() {
      throw new Error("WebSocket is not used by this script");
    }
  };
}

console.log(process.argv[2]);

const TRANSCRIPT_BUCKET = "recording";
const TRANSCRIPT_INDEX = "transcription";

export async function getSemanticSearch() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_API_SECRET!
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const index = supabase.storage.vectors
    .from(TRANSCRIPT_BUCKET)
    .index(TRANSCRIPT_INDEX);

  const embRes = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: "Hello from the diagnostic script.",
  });
  const embedding = embRes.data[0].embedding;

  const queryRes = await index.queryVectors({
    queryVector: { float32: embedding },
    topK: 5,
    filter: { user_id: process.argv[2] },
    returnMetadata: true,
  });
  const arr: string[] = [];
  for (const hit of queryRes.data?.vectors ?? []) {
    const meta = hit.metadata as { chunk_text?: string } | undefined;
    if (meta?.chunk_text) {
      arr.push(meta.chunk_text);
    }
  }
  return arr;
}

console.log(await getSemanticSearch());
