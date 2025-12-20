import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env.client' // Ensure you have this or use process.env directly if env.client is missing

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}