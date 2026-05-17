"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";

const AUTH_USER_KEY = ["auth-user"] as const;

export function useAuthUser() {
  const queryClient = useQueryClient();

  const query = useQuery<User | null>({
    queryKey: AUTH_USER_KEY,
    queryFn: async () => {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(AUTH_USER_KEY, session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  return query;
}
