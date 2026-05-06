import { createClient } from "@supabase/supabase-js";
import { openai } from "./ai_tools";

export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_DIMENSION = 3072;

export const TRANSCRIPT_BUCKET = "recording";
export const TRANSCRIPT_INDEX = "transcription";

export const supabaseVector = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_API_SECRET!
);

export async function createEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}
