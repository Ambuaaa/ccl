'use server'

import { createClient } from '@/lib/supabase/server'
import { getClubId } from '@/lib/club'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from './types'

const tournamentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  start_date: z.string().date(),
  end_date: z.string().date().optional(),
  format: z.enum(['single_round_robin_final', 'double_round_robin_final', 'custom']),
  has_final: z.boolean(),
  qualifiers_count: z.number().int().min(2).max(4),
  points_for_win: z.number().int().min(1),
  points_for_tie: z.number().int().min(0),
  points_for_no_result: z.number().int().min(0),
  player_ids: z.array(z.string().uuid()).min(2),
})

function intFromForm(value: FormDataEntryValue | null, fallback: number): number {
  if (value === null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function createTournament(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const clubId = await getClubId(supabase)

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') || undefined,
    format: formData.get('format'),
    has_final: formData.get('has_final') === 'true',
    qualifiers_count: intFromForm(formData.get('qualifiers_count'), 2),
    points_for_win: intFromForm(formData.get('points_for_win'), 2),
    points_for_tie: intFromForm(formData.get('points_for_tie'), 1),
    points_for_no_result: intFromForm(formData.get('points_for_no_result'), 1),
    player_ids: formData.getAll('player_ids'),
  }

  const parsed = tournamentSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.flatten() }
  }

  const rulesSnapshot = {
    points_for_win: parsed.data.points_for_win,
    points_for_tie: parsed.data.points_for_tie,
    points_for_no_result: parsed.data.points_for_no_result,
    tie_breakers: ['points', 'head_to_head', 'nrr'],
    has_final: parsed.data.has_final,
    qualifiers_count: parsed.data.qualifiers_count,
  }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      club_id: clubId,
      name: parsed.data.name,
      description: parsed.data.description,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      format: parsed.data.format,
      has_final: parsed.data.has_final,
      qualifiers_count: parsed.data.qualifiers_count,
      points_for_win: parsed.data.points_for_win,
      points_for_tie: parsed.data.points_for_tie,
      points_for_no_result: parsed.data.points_for_no_result,
      status: 'draft',
      rules_snapshot: rulesSnapshot,
    })
    .select()
    .single()

  if (error) throw error

  // Add tournament players
  const tournamentPlayers = parsed.data.player_ids.map((player_id) => ({
    tournament_id: tournament.id,
    player_id,
  }))

  const { error: tpError } = await supabase
    .from('tournament_players')
    .insert(tournamentPlayers)

  if (tpError) throw tpError

  revalidatePath('/tournaments')
  revalidatePath('/')
  
  return { tournament }
}

export async function updateTournament(tournamentId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  
  if (formData.has('name') && formData.get('name')) updates.name = formData.get('name')
  if (formData.has('description')) updates.description = formData.get('description') || null
  if (formData.get('start_date')) updates.start_date = formData.get('start_date')
  if (formData.has('end_date')) updates.end_date = formData.get('end_date') || null
  if (formData.get('format')) updates.format = formData.get('format')
  if (formData.has('has_final')) updates.has_final = formData.get('has_final') === 'true'
  if (formData.has('qualifiers_count')) updates.qualifiers_count = intFromForm(formData.get('qualifiers_count'), 2)
  if (formData.has('points_for_win')) updates.points_for_win = intFromForm(formData.get('points_for_win'), 2)
  if (formData.has('points_for_tie')) updates.points_for_tie = intFromForm(formData.get('points_for_tie'), 1)
  if (formData.has('points_for_no_result')) updates.points_for_no_result = intFromForm(formData.get('points_for_no_result'), 1)
  if (formData.get('status')) updates.status = formData.get('status')

  if (formData.get('status') === 'completed') {
    updates.completed_at = new Date().toISOString()
  }

  // Keep the rules snapshot in sync so standings reflect edited rules
  const ruleFields = ['points_for_win', 'points_for_tie', 'points_for_no_result', 'has_final', 'qualifiers_count'] as const
  if (ruleFields.some((field) => field in updates)) {
    const { data: existing } = await supabase
      .from('tournaments')
      .select('rules_snapshot')
      .eq('id', tournamentId)
      .single()

    const previous = (existing?.rules_snapshot ?? {}) as Record<string, unknown>
    const snapshot: Record<string, unknown> = { ...previous }
    for (const field of ruleFields) {
      if (field in updates) snapshot[field] = updates[field]
    }
    updates.rules_snapshot = snapshot
  }

  const { error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', tournamentId)

  if (error) throw error

  // Update tournament players if provided
  const playerIds = formData.getAll('player_ids')
  if (playerIds.length > 0) {
    await supabase.from('tournament_players').delete().eq('tournament_id', tournamentId)
    const tournamentPlayers = playerIds.map((player_id) => ({
      tournament_id: tournamentId,
      player_id,
    }))
    await supabase.from('tournament_players').insert(tournamentPlayers)
  }

  revalidatePath('/tournaments')
  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath('/')
  
  return { success: true }
}

export async function generateFixtures(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, start_date, format, has_final, qualifiers_count, club_id')
    .eq('id', tournamentId)
    .single()

  if (!tournament) throw new Error('Tournament not found')

  const { data: players } = await supabase
    .from('tournament_players')
    .select('player_id, players!inner(id, display_name)')
    .eq('tournament_id', tournamentId)

  if (!players || players.length < 2) throw new Error('Not enough players')

  if (tournament.format === 'custom') {
    return { error: 'Automatic fixtures are not available for custom tournaments. Add matches manually.' }
  }

  const { count: existingFixtures } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('stage', 'league')

  if ((existingFixtures ?? 0) > 0) {
    return { error: 'Fixtures have already been generated for this tournament.' }
  }

  // Ensure a session exists to host the generated fixtures (matches require a session)
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('tournament_id', tournament.id)
    .eq('session_type', 'tournament')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let sessionId: string

  if (existingSession?.id) {
    sessionId = existingSession.id
  } else {
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        club_id: tournament.club_id,
        title: `${tournament.name} — League`,
        session_date: tournament.start_date,
        session_type: 'tournament',
        tournament_id: tournament.id,
        status: 'planned',
      })
      .select('id')
      .single()

    if (sessionError) throw sessionError
    sessionId = newSession.id

    await supabase
      .from('session_players')
      .upsert(
        players.map((p) => ({ session_id: sessionId, player_id: p.player_id })),
        { ignoreDuplicates: true }
      )
  }

  const playerIds = players.map(p => p.player_id)
  const fixtures: Array<{
    club_id: string
    session_id: string
    tournament_id: string
    stage: 'league' | 'final'
    round_number: number
    fixture_label: string
    player_a_id: string
    player_b_id: string
    status: 'scheduled'
  }> = []

  if (tournament.format === 'single_round_robin_final') {
    // Single round robin: each pair plays once
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        fixtures.push({
          tournament_id: tournament.id,
          club_id: tournament.club_id,
          session_id: sessionId,
          stage: 'league',
          round_number: 1,
          fixture_label: `Match ${fixtures.length + 1}`,
          player_a_id: playerIds[i],
          player_b_id: playerIds[j],
          status: 'scheduled',
        })
      }
    }
  } else if (tournament.format === 'double_round_robin_final') {
    // Double round robin: each pair plays twice (home and away)
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        // First meeting
        fixtures.push({
          tournament_id: tournament.id,
          club_id: tournament.club_id,
          session_id: sessionId,
          stage: 'league',
          round_number: 1,
          fixture_label: `Match ${fixtures.length + 1}`,
          player_a_id: playerIds[i],
          player_b_id: playerIds[j],
          status: 'scheduled',
        })
        // Second meeting (reversed)
        fixtures.push({
          tournament_id: tournament.id,
          club_id: tournament.club_id,
          session_id: sessionId,
          stage: 'league',
          round_number: 2,
          fixture_label: `Match ${fixtures.length + 1}`,
          player_a_id: playerIds[j],
          player_b_id: playerIds[i],
          status: 'scheduled',
        })
      }
    }
  }

  // Insert fixtures as matches
  const { error } = await supabase
    .from('matches')
    .insert(fixtures)

  if (error) throw error

  // Update tournament status to active
  await supabase
    .from('tournaments')
    .update({ status: 'active' })
    .eq('id', tournamentId)

  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath('/fixtures')
  
  return { success: true, count: fixtures.length }
}

export async function getTournaments(clubId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_players (player_id),
      matches (id, status, stage, winner_player_id)
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getTournament(tournamentId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_players (player_id),
      matches (
        *,
        player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
        player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
        winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
        player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url),
        session:sessions (id, title, session_date)
      )
    `)
    .eq('id', tournamentId)
    .single()

  if (error) throw error
  return data
}

export async function deleteTournament(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)

  if (error) throw error

  revalidatePath('/tournaments')
  revalidatePath('/')
  
  return { success: true }
}