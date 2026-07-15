import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _instance: SupabaseClient | undefined;

function getInstance(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_API_SECRET!
    );
  }
  return _instance;
}

// Lazy proxy so importing this module doesn't require env vars until first real use.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_: SupabaseClient, prop: string | symbol) {
    return getInstance()[prop as keyof SupabaseClient];
  },
});

export const RECORDINGS_BUCKET = "recording";
export const FILES_BUCKET = "projectFiles";
