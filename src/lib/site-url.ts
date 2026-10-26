/**
 * Safely resolves the site base URL across all environments (Vercel, custom domain, localhost).
 * Safe to use in both Client Components and Server Actions with zero restricted imports.
 */
export function getSiteUrl(): string {
  // 1. In the browser, always use the current active origin (e.g. https://your-ccl.vercel.app or http://localhost:3000)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  // 2. Explicit custom domain if set in environment (e.g. NEXT_PUBLIC_SITE_URL=https://my-league.com)
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '')
  }

  // 3. Vercel automatically injected production domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  // 4. Vercel deployment preview domain
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 5. Default fallback for local development
  return 'http://localhost:3000'
}

// Aliases for compatibility
export const getServerSiteUrl = getSiteUrl
export const getClientSiteUrl = getSiteUrl
