'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServerSiteUrl } from '@/lib/site-url'
import type { ActionResult } from './types'

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const siteUrl = await getServerSiteUrl()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: displayName ? { display_name: displayName.trim() } : undefined,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // If a session was returned immediately (confirmation disabled), attempt profile creation
  if (data.session && displayName && displayName.trim()) {
    try {
      await supabase.rpc('ensure_player_profile', {
        p_display_name: displayName.trim(),
      })
    } catch {
      // Non-fatal, onboarding page handles profile setup
    }
  }

  return {
    success: true,
    requiresConfirmation: !data.session,
    user: data.user ? { id: data.user.id, email: data.user.email } : undefined,
  }
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    session: data.session ? { id: data.session.access_token } : undefined,
  }
}

export async function signInWithEmail(email: string): Promise<ActionResult> {
  const supabase = await createClient()
  const siteUrl = await getServerSiteUrl()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function resendConfirmationEmail(email: string): Promise<ActionResult> {
  const supabase = await createClient()
  const siteUrl = await getServerSiteUrl()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function resetPasswordForEmail(email: string): Promise<ActionResult> {
  const supabase = await createClient()
  const siteUrl = await getServerSiteUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/settings`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}