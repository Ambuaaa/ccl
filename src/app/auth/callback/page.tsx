'use client'

import { Suspense, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('Verifying your credentials...')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    let isMounted = true

    async function handlePostAuth(next: string) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && isMounted) {
          setMessage('Setting up your league profile...')
          const { data: player } = await supabase
            .from('players')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()

          if (!player) {
            const metaName = (user.user_metadata?.display_name as string)?.trim()
            if (metaName) {
              await supabase.rpc('ensure_player_profile', { p_display_name: metaName })
              router.push(next)
              return
            } else {
              router.push('/onboarding')
              return
            }
          }
        }
        router.push(next)
      } catch (e) {
        console.error('Error during post-auth setup:', e)
        router.push(next)
      }
    }

    async function handleCallback() {
      const code = searchParams.get('code')
      const next = searchParams.get('next') || '/'
      const authError = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (authError) {
        setError(errorDescription || authError)
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          if (isMounted) setError(exchangeError.message)
          return
        }
        await handlePostAuth(next)
      } else {
        // If arrived via hash fragment or already verified session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await handlePostAuth(next)
        } else {
          // Listen for auth state change in case hash is being parsed by Supabase client
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session && isMounted) {
              authListener.subscription.unsubscribe()
              await handlePostAuth(next)
            }
          })
          // Fallback timer if no auth happens
          const timer = setTimeout(() => {
            if (isMounted && !error) {
              router.push(next)
            }
          }, 3000)
          return () => {
            clearTimeout(timer)
            authListener.subscription.unsubscribe()
          }
        }
      }
    }

    handleCallback()

    return () => {
      isMounted = false
    }
  }, [searchParams, router, supabase, error])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 shadow-lg shadow-green-900/30">
          {error ? (
            <AlertCircle className="h-8 w-8 text-white" />
          ) : (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {error ? 'Authentication Error' : 'Welcome to CCL'}
        </h1>
        <p className="text-slate-400">
          {error ? 'We encountered a problem authenticating your session.' : message}
        </p>

        {error && (
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-sm flex items-center gap-2 justify-center text-left">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button asChild variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900">
                <Link href="/auth/login">Back to Sign In</Link>
              </Button>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/auth/signup">
                  Create Account <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <Loader2 className="h-10 w-10 text-green-400 animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
