export function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return ''
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
}
