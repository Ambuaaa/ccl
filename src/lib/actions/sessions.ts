'use server'

import { createClient } from '@/lib/supabase/server'
import { getClubId } from '@/lib/club'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from './types'

const createSessionSchema = z.object({
  title: z.string().optional(),
  session_date: z.string().date(),
  session_type: z.enum(['casual', 'tournament']),
  notes: z.string().optional(),
  player_ids: z.array(z.string().uuid()).min(1),
  tournament_id: z.string().uuid().optional(),
})

export async function createSession(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const clubId = await getClubId(supabase)

  const rawData = {
    title: formData.get('title') || undefined,
    session_date: formData.get('session_date'),
    session_type: formData.get('session_type'),
    notes: formData.get('notes') || undefined,
    player_ids: formData.getAll('player_ids'),
    tournament_id: formData.get('tournament_id') || undefined,
  }

  const parsed = createSessionSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.flatten() }
  }

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      club_id: clubId,
      title: parsed.data.title,
      session_date: parsed.data.session_date,
      session_type: parsed.data.session_type,
      notes: parsed.data.notes,
      status: 'planned',
    })
    .select()
    .single()

  if (sessionError) throw sessionError

  // Add session players
  const sessionPlayers = parsed.data.player_ids.map((player_id) => ({
    session_id: session.id,
    player_id,
  }))

  const { error: spError } = await supabase
    .from('session_players')
    .insert(sessionPlayers)

  if (spError) throw spError

  // If tournament_id provided, link session to tournament
  if (parsed.data.tournament_id) {
    await supabase
      .from('sessions')
      .update({ tournament_id: parsed.data.tournament_id })
      .eq('id', session.id)
  }

  revalidatePath('/sessions')
  revalidatePath('/')
  
  return { session }
}

export async function updateSession(sessionId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  
  if (formData.has('title')) updates.title = formData.get('title') || null
  if (formData.get('session_date')) updates.session_date = formData.get('session_date')
  if (formData.get('session_type')) updates.session_type = formData.get('session_type')
  if (formData.has('notes')) updates.notes = formData.get('notes') || null
  if (formData.get('status')) updates.status = formData.get('status')
  if (formData.has('tournament_id')) updates.tournament_id = formData.get('tournament_id') || null

  if (formData.get('status') === 'completed') {
    updates.completed_at = new Date().toISOString()
  } else if (formData.get('status')) {
    updates.completed_at = null
  }

  const { error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)

  if (error) throw error

  // Update session players if provided
  const playerIds = formData.getAll('player_ids')
  if (playerIds.length > 0) {
    await supabase.from('session_players').delete().eq('session_id', sessionId)
    const sessionPlayers = playerIds.map((player_id) => ({
      session_id: sessionId,
      player_id,
    }))
    await supabase.from('session_players').insert(sessionPlayers)
  }

  revalidatePath('/sessions')
  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath('/')
  
  return { success: true }
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error

  revalidatePath('/sessions')
  revalidatePath('/')
  
  return { success: true }
}

export async function getSessions(clubId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      session_players (player_id),
      matches (id, status, player_a_id, player_b_id, winner_player_id)
    `)
    .eq('club_id', clubId)
    .order('session_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getSession(sessionId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      session_players (player_id),
      matches (
        *,
        player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
        player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
        winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
        player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url)
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data
}