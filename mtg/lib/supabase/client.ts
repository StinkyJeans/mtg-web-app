import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components. The browser build caches one instance. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
