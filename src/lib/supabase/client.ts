import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Supabase client for Client Components. Runs as the signed-in user, RLS applies. */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
