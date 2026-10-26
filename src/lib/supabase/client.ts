import { createBrowserClient } from '@supabase/ssr'
import { sanitizeSupabaseUrl } from './utils'

export function createClient() {
  return createBrowserClient(
    sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}