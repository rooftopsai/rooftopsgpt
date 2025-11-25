import { createClient } from "@supabase/supabase-js"

// Service role client for server-side operations (works in edge runtime)
// This bypasses RLS and should only be used in server-side code
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
