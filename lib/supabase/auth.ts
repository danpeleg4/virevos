import { createServerSupabase } from "./server";

export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
