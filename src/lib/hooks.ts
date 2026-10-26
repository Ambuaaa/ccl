'use client'

import { createBrowserClient } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'

export function useSupabase() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
  return supabase
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, session, loading, supabase }
}

export function useClub() {
  const { user, supabase, loading: authLoading } = useAuth()
  const [clubId, setClubId] = useState<string | null>(null)
  const [clubName, setClubName] = useState<string>('Cousins Cricket League')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user) {
      supabase
        .from('players')
        .select('club_id, clubs(name)')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setClubId(data.club_id)
            const club = data.clubs as unknown as { name: string } | null
            setClubName(club?.name || 'Cousins Cricket League')
          }
          setLoading(false)
        })
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading, supabase])

  return { clubId, clubName, loading: authLoading || loading }
}