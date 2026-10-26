'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, cn, getInitials } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, GitBranch, TrendingUp, Trophy, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { calculateHeadToHead } from '@/lib/actions/stats'

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
}

interface HeadToHead {
  player_a: { id: string; display_name: string }
  player_b: { id: string; display_name: string }
  matches_played: number
  player_a_wins: number
  player_b_wins: number
  ties: number
  no_results: number
  player_a_runs: number
  player_b_runs: number
  player_a_highest: number
  player_b_highest: number
  most_recent_match: any | null
  recent_results: any[]
}

export function RivalriesClient() {
  const [players, setPlayers] = useState<Player[]>([])
  const [rivalries, setRivalries] = useState<HeadToHead[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const targetClubId = await getClubId(supabase)
      setClubId(targetClubId)

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, display_name, avatar_url')
        .eq('club_id', targetClubId)
        .eq('is_active', true)
        .order('display_name')

      if (playersError) throw playersError
      setPlayers(playersData || [])

      // Calculate all pairwise head-to-head records
      const h2hPromises: Promise<HeadToHead>[] = []
      for (let i = 0; i < (playersData || []).length; i++) {
        for (let j = i + 1; j < (playersData || []).length; j++) {
          h2hPromises.push(
            calculateHeadToHead(targetClubId, playersData[i].id, playersData[j].id)
          )
        }
      }

      const h2hResults = await Promise.all(h2hPromises)
      setRivalries(h2hResults.filter(r => r.matches_played > 0).sort((a, b) => b.matches_played - a.matches_played))
    } catch (error) {
      console.error('Error loading rivalries:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Rivalries</h1>
          <p className="text-slate-400">Head-to-head records between players</p>
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rivalries</h1>
        <p className="text-slate-400">Head-to-head records between players</p>
      </div>

      {rivalries.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="empty-state">
              <GitBranch className="empty-state-icon h-12 w-12" />
              <h3 className="empty-state-title">No rivalries yet</h3>
              <p className="empty-state-description">Play matches against each other to build head-to-head records.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rivalries.map((rivalry, index) => {
            const total = rivalry.matches_played
            const playerAWinPct = total > 0 ? Math.round((rivalry.player_a_wins / total) * 100) : 0
            const playerBWinPct = total > 0 ? Math.round((rivalry.player_b_wins / total) * 100) : 0
            const leader = rivalry.player_a_wins > rivalry.player_b_wins ? rivalry.player_a : rivalry.player_b
            const leaderWins = rivalry.player_a_wins > rivalry.player_b_wins ? rivalry.player_a_wins : rivalry.player_b_wins
            const trailingWins = rivalry.player_a_wins > rivalry.player_b_wins ? rivalry.player_b_wins : rivalry.player_a_wins

            return (
              <Card key={`${rivalry.player_a.id}-${rivalry.player_b.id}`} className="hover:border-green-600/50 transition-colors">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                        {getInitials(rivalry.player_a.display_name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{rivalry.player_a.display_name}</h3>
                        <p className="text-sm text-slate-400">{rivalry.player_a_wins}W · {rivalry.player_b_wins}L · {rivalry.ties}T</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-center">
                      <div className="w-16">
                        <p className="text-2xl font-bold text-white">{leaderWins}</p>
                        <p className="text-xs text-slate-400">Wins</p>
                      </div>
                      <div className="w-16">
                        <p className="text-2xl font-bold text-yellow-400">{rivalry.ties}</p>
                        <p className="text-xs text-slate-400">Ties</p>
                      </div>
                      <div className="w-16">
                        <p className="text-2xl font-bold text-white">{trailingWins}</p>
                        <p className="text-xs text-slate-400">Wins</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-16">
                          <p className="text-2xl font-bold text-white">{rivalry.player_b_wins}</p>
                          <p className="text-xs text-slate-400">Wins</p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{rivalry.player_b.display_name}</h3>
                          <p className="text-sm text-slate-400">{rivalry.player_b_wins}W · {rivalry.player_a_wins}L · {rivalry.ties}T</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                          {getInitials(rivalry.player_b.display_name)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                      <p className="text-2xl font-bold text-white">{total}</p>
                      <p className="text-sm text-slate-400">Matches</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                      <p className="text-2xl font-bold text-white">{rivalry.player_a_runs + rivalry.player_b_runs}</p>
                      <p className="text-sm text-slate-400">Total Runs</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                      <p className="text-2xl font-bold text-white">{Math.max(rivalry.player_a_highest, rivalry.player_b_highest)}</p>
                      <p className="text-sm text-slate-400">Highest Score</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                      <p className="text-2xl font-bold text-white">
                        {rivalry.player_a_wins > rivalry.player_b_wins ? rivalry.player_a.display_name : rivalry.player_b.display_name}
                      </p>
                      <p className="text-sm text-slate-400">Leads</p>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <Separator className="my-4" />
                  <div className="grid gap-4 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-slate-400">{rivalry.player_a.display_name} Runs</p>
                      <p className="font-medium text-white">{rivalry.player_a_runs}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">{rivalry.player_b.display_name} Runs</p>
                      <p className="font-medium text-white">{rivalry.player_b_runs}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">{rivalry.player_a.display_name} Highest</p>
                      <p className="font-medium text-white">{rivalry.player_a_highest}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">{rivalry.player_b.display_name} Highest</p>
                      <p className="font-medium text-white">{rivalry.player_b_highest}</p>
                    </div>
                  </div>

                  {/* Recent Matches */}
                  {rivalry.recent_results.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-400 mb-2">Recent Meetings</p>
                      <div className="flex gap-2 flex-wrap">
                        {rivalry.recent_results.slice(0, 5).map((match, i) => {
                          const isPlayerAWinner = match.winner_player_id === rivalry.player_a.id
                          return (
                            <Badge key={i} className={cn(
                              isPlayerAWinner ? 'badge-green' :
                              match.winner_player_id === rivalry.player_b.id ? 'badge-red' : 'badge-yellow'
                            )}>
                              {isPlayerAWinner ? 'W' : match.winner_player_id ? 'L' : 'T'}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Most Recent Match */}
                  {rivalry.most_recent_match && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-800/50">
                      <p className="text-sm text-slate-400">Last Meeting: {formatDate(rivalry.most_recent_match.session?.session_date || rivalry.most_recent_match.created_at)}</p>
                      <p className="text-sm text-slate-300">
                        {rivalry.most_recent_match.player_a.display_name} {rivalry.most_recent_match.player_a_runs}/{rivalry.most_recent_match.player_a_wickets} vs
                        {rivalry.most_recent_match.player_b.display_name} {rivalry.most_recent_match.player_b_runs}/{rivalry.most_recent_match.player_b_wickets}
                        {rivalry.most_recent_match.winner && ` — ${rivalry.most_recent_match.winner.display_name} won`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}