import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_API_SECRET!
);

export const RECORDINGS_BUCKET = "recording";
export const TRANSCRIPTS_BUCKET = "jsonFiles";
export const FILES_BUCKET = "projectFiles";
