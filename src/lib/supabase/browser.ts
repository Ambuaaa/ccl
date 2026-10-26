'use client'

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import { sanitizeSupabaseUrl } from './utils'

function buildClient() {
  const url = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseBrowserClient(url, key)
}

let client: ReturnType<typeof buildClient> | null = null

export function createBrowserClient(_url?: string, _key?: string) {
  if (!client) {
    client = buildClient()
  }
  return client
}
