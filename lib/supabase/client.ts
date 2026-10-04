import { createBrowserClient } from "@supabase/ssr"
import { createSupabaseFetch } from "@/lib/supabase/fetch"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: createSupabaseFetch(),
      },
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
      },
    }
  )
}
