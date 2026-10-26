'use server'

import { createClient } from '@/lib/supabase/server'
import { getClubId } from '@/lib/club'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from './types'

const playerSchema = z.object({
  display_name: z.string().min(1).max(100),
  avatar_url: z.string().url().optional().nullable(),
})

export async function createPlayer(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const clubId = await getClubId(supabase)

  const rawData = {
    display_name: formData.get('display_name'),
    avatar_url: formData.get('avatar_url') || null,
  }

  const parsed = playerSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.flatten() }
  }

  const { data: player, error } = await supabase
    .from('players')
    .insert({
      club_id: clubId,
      display_name: parsed.data.display_name,
      avatar_url: parsed.data.avatar_url,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/players')
  revalidatePath('/settings')
  
  return { player }
}

export async function updatePlayer(playerId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  
  if (formData.get('display_name')) updates.display_name = formData.get('display_name')
  if (formData.has('avatar_url')) updates.avatar_url = formData.get('avatar_url') || null
  if (formData.has('is_active')) updates.is_active = formData.get('is_active') === 'true'

  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', playerId)

  if (error) throw error

  revalidatePath('/players')
  revalidatePath(`/players/${playerId}`)
  revalidatePath('/settings')
  
  return { success: true }
}

export async function getPlayers(clubId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('display_name')

  if (error) throw error
  return data
}

export async function getPlayer(playerId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()

  if (error) throw error
  return data
}

export async function linkPlayerToUser(playerId: string): Promise<ActionResult> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('players')
    .update({ user_id: user.id })
    .eq('id', playerId)

  if (error) throw error

  revalidatePath('/players')
  revalidatePath('/settings')
  
  return { success: true }
}

export async function ensurePlayerProfile(displayName: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in' }

  const { data, error } = await supabase.rpc('ensure_player_profile', {
    p_display_name: displayName,
  })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/players')
  revalidatePath('/settings')

  return { success: true, player: data as { id: string } & Record<string, unknown> }
}