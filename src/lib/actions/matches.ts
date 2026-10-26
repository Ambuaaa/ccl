'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from './types'

const createMatchSchema = z.object({
  session_id: z.string().uuid(),
  tournament_id: z.string().uuid().optional(),
  stage: z.enum(['casual', 'league', 'semifinal', 'final', 'custom']),
  round_number: z.number().optional(),
  fixture_label: z.string().optional(),
  player_a_id: z.string().uuid(),
  player_b_id: z.string().uuid(),
  scheduled_at: z.string().optional(),
})

const resultSchema = z.object({
  match_id: z.string().uuid(),
  player_a_runs: z.number().int().min(0).optional(),
  player_a_wickets: z.number().int().min(0).max(10).optional(),
  player_a_balls_faced: z.number().int().min(0).optional(),
  player_b_runs: z.number().int().min(0).optional(),
  player_b_wickets: z.number().int().min(0).max(10).optional(),
  player_b_balls_faced: z.number().int().min(0).optional(),
  winner_player_id: z.string().uuid().optional(),
  result_type: z.enum(['player_a_win', 'player_b_win', 'tie', 'no_result', 'abandoned']).optional(),
  result_margin_runs: z.number().int().min(0).optional(),
  result_margin_wickets: z.number().int().min(0).max(10).optional(),
  player_of_match_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'abandoned', 'no_result']),
})

export async function createMatch(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    session_id: formData.get('session_id'),
    tournament_id: formData.get('tournament_id') || undefined,
    stage: formData.get('stage'),
    round_number: formData.get('round_number') ? parseInt(formData.get('round_number') as string) : undefined,
    fixture_label: formData.get('fixture_label') || undefined,
    player_a_id: formData.get('player_a_id'),
    player_b_id: formData.get('player_b_id'),
    scheduled_at: formData.get('scheduled_at') || undefined,
  }

  const parsed = createMatchSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.flatten() }
  }

  if (parsed.data.player_a_id === parsed.data.player_b_id) {
    return { error: 'Players must be different' }
  }

  const { data: session } = await supabase
    .from('sessions')
    .select('club_id')
    .eq('id', parsed.data.session_id)
    .single()

  if (!session) throw new Error('Session not found')

  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      club_id: session.club_id,
      session_id: parsed.data.session_id,
      tournament_id: parsed.data.tournament_id,
      stage: parsed.data.stage,
      round_number: parsed.data.round_number,
      fixture_label: parsed.data.fixture_label,
      player_a_id: parsed.data.player_a_id,
      player_b_id: parsed.data.player_b_id,
      scheduled_at: parsed.data.scheduled_at,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/sessions/${parsed.data.session_id}`)
  revalidatePath('/')
  
  return { match }
}

export async function updateMatchResult(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    match_id: formData.get('match_id'),
    player_a_runs: formData.get('player_a_runs') ? parseInt(formData.get('player_a_runs') as string) : undefined,
    player_a_wickets: formData.get('player_a_wickets') ? parseInt(formData.get('player_a_wickets') as string) : undefined,
    player_a_balls_faced: formData.get('player_a_balls_faced') ? parseInt(formData.get('player_a_balls_faced') as string) : undefined,
    player_b_runs: formData.get('player_b_runs') ? parseInt(formData.get('player_b_runs') as string) : undefined,
    player_b_wickets: formData.get('player_b_wickets') ? parseInt(formData.get('player_b_wickets') as string) : undefined,
    player_b_balls_faced: formData.get('player_b_balls_faced') ? parseInt(formData.get('player_b_balls_faced') as string) : undefined,
    winner_player_id: formData.get('winner_player_id') || undefined,
    result_type: formData.get('result_type') || undefined,
    result_margin_runs: formData.get('result_margin_runs') ? parseInt(formData.get('result_margin_runs') as string) : undefined,
    result_margin_wickets: formData.get('result_margin_wickets') ? parseInt(formData.get('result_margin_wickets') as string) : undefined,
    player_of_match_id: formData.get('player_of_match_id') || undefined,
    notes: formData.get('notes') || undefined,
    status: formData.get('status'),
  }

  const parsed = resultSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.flatten() }
  }

  // Validate result logic
  if (parsed.data.status === 'completed') {
    const { data: match } = await supabase
      .from('matches')
      .select('player_a_id, player_b_id, player_a_runs, player_b_runs')
      .eq('id', parsed.data.match_id)
      .single()

    if (match) {
      const runsA = parsed.data.player_a_runs ?? match.player_a_runs
      const runsB = parsed.data.player_b_runs ?? match.player_b_runs

      if (runsA !== null && runsB !== null) {
        if (runsA > runsB) {
          parsed.data.result_type = 'player_a_win'
          parsed.data.winner_player_id = match.player_a_id
        } else if (runsB > runsA) {
          parsed.data.result_type = 'player_b_win'
          parsed.data.winner_player_id = match.player_b_id
        } else {
          parsed.data.result_type = 'tie'
          parsed.data.winner_player_id = undefined
        }
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    played_at: parsed.data.status === 'completed' || parsed.data.status === 'in_progress' 
      ? new Date().toISOString() 
      : null,
    completed_at: parsed.data.status === 'completed' ? new Date().toISOString() : null,
  }

  if (
    parsed.data.result_type === 'tie' ||
    parsed.data.result_type === 'no_result' ||
    parsed.data.result_type === 'abandoned'
  ) {
    updatePayload.winner_player_id = null
  }

  const { data: match, error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('id', parsed.data.match_id)
    .select(`
      *,
      session:session_id (id),
      tournament:tournament_id (id)
    `)
    .single()

  if (error) throw error

  // Revalidate relevant paths
  revalidatePath(`/sessions/${match.session.id}`)
  if (match.tournament) {
    revalidatePath(`/tournaments/${match.tournament.id}`)
  }
  revalidatePath('/standings')
  revalidatePath('/players')
  revalidatePath('/rivalries')
  revalidatePath('/records')
  revalidatePath('/')
  
  return { match }
}

export async function getMatch(matchId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
      player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
      winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
      player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url),
      session:sessions (id, title, session_date),
      tournament:tournaments (id, name)
    `)
    .eq('id', matchId)
    .single()

  if (error) throw error
  return data
}

export async function getMatchesBySession(sessionId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
      player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
      winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
      player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getMatchesByTournament(tournamentId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
      player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
      winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
      player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url),
      session:sessions (id, title, session_date)
    `)
    .eq('tournament_id', tournamentId)
    .order('stage', { ascending: true })
    .order('round_number', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function deleteMatch(matchId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('session_id, tournament_id')
    .eq('id', matchId)
    .single()

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)

  if (error) throw error

  if (match?.session_id) revalidatePath(`/sessions/${match.session_id}`)
  if (match?.tournament_id) revalidatePath(`/tournaments/${match.tournament_id}`)
  revalidatePath('/standings')
  revalidatePath('/players')
  revalidatePath('/rivalries')
  revalidatePath('/records')
  revalidatePath('/')
  
  return { success: true }
}