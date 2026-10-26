import { SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_CLUB_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Gets the current active club ID.
 * In no-auth mode, all cousins share the single league club.
 */
export async function getClubId(supabase: SupabaseClient): Promise<string> {
  try {
    const { data: club } = await supabase
      .from('clubs')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (club?.id) {
      return club.id
    }
  } catch (err) {
    console.warn('Error fetching club id, using default:', err)
  }
  return DEFAULT_CLUB_ID
}
