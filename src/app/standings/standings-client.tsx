'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trophy,
  TrendingUp,
  Target,
  Users,
  Crown,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { calculateTournamentStandings } from '@/lib/actions/stats'

interface Tournament {
  id: string
  name: string
  status: string
  format: string
  has_final: boolean
  qualifiers_count: number
  points_for_win: number
  points_for_tie: number
  points_for_no_result: number
  matches: Array<{ id: string; status: string; stage: string; winner_player_id: string | null }>
  tournament_players: Array<{ player_id: string; players: { id: string; display_name: string } }>
}

interface Standing {
  player: { id: string; display_name: string; avatar_url: string | null }
  position: number
  matches_played: number
  wins: number
  losses: number
  ties: number
  no_results: number
  points: number
  runs_scored: number
  runs_conceded: number
  wickets_lost: number
  wickets_taken: number
  balls_faced: number
  balls_bowled: number
  nrr: number | null
  qualified: boolean | null
}

export function StandingsClient() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [standings, setStandings] = useState<Record<string, Standing[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all-time')
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

      // Load tournaments
      const { data: tournamentsData, error: tourneyError } = await supabase
        .from('tournaments')
        .select(`
          *,
          matches (id, status, stage, winner_player_id),
          tournament_players (player_id, players:players!inner (id, display_name))
        `)
        .eq('club_id', targetClubId)
        .order('created_at', { ascending: false })

      if (tourneyError) throw tourneyError
      setTournaments(tournamentsData || [])

      // Load standings for active/completed tournaments
      for (const t of tournamentsData || []) {
        if (['active', 'completed'].includes(t.status)) {
          const standingsData = await calculateTournamentStandings(t.id)
          setStandings(prev => ({ ...prev, [t.id]: standingsData }))
        }
      }

      // Load all-time club stats
      const { data: allMatches } = await supabase
        .from('matches')
        .select('player_a_id, player_b_id, winner_player_id, status, result_type, player_a_runs, player_b_runs, player_a_wickets, player_b_wickets, player_a_balls_faced, player_b_balls_faced')
        .eq('club_id', targetClubId)
        .eq('status', 'completed')

      // Calculate all-time standings
      if (allMatches) {
          const { data: players } = await supabase
            .from('players')
            .select('id, display_name, avatar_url')
            .eq('club_id', targetClubId)

        const playerStats = new Map<string, {
          player: { id: string; display_name: string; avatar_url: string | null }
          matches_played: number
          wins: number
          losses: number
          ties: number
          no_results: number
          points: number
          runs_scored: number
          runs_conceded: number
          wickets_lost: number
          wickets_taken: number
          balls_faced: number
          balls_bowled: number
        }>()

        if (players) {
          for (const p of players) {
            playerStats.set(p.id, {
              player: p,
              matches_played: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              no_results: 0,
              points: 0,
              runs_scored: 0,
              runs_conceded: 0,
              wickets_lost: 0,
              wickets_taken: 0,
              balls_faced: 0,
              balls_bowled: 0,
            })
          }
        }

        for (const m of allMatches) {
          const statsA = playerStats.get(m.player_a_id)
          const statsB = playerStats.get(m.player_b_id)

          if (!statsA || !statsB) continue

          statsA.matches_played++
          statsB.matches_played++

          if (m.player_a_runs !== null) {
            statsA.runs_scored += m.player_a_runs
            statsB.runs_conceded += m.player_a_runs
          }
          if (m.player_b_runs !== null) {
            statsB.runs_scored += m.player_b_runs
            statsA.runs_conceded += m.player_b_runs
          }
          if (m.player_a_wickets !== null) {
            statsA.wickets_lost += m.player_a_wickets
            statsB.wickets_taken += m.player_a_wickets
          }
          if (m.player_b_wickets !== null) {
            statsB.wickets_lost += m.player_b_wickets
            statsA.wickets_taken += m.player_b_wickets
          }
          if (m.player_a_balls_faced !== null) {
            statsA.balls_faced += m.player_a_balls_faced
            statsB.balls_bowled += m.player_a_balls_faced
          }
          if (m.player_b_balls_faced !== null) {
            statsB.balls_faced += m.player_b_balls_faced
            statsA.balls_bowled += m.player_b_balls_faced
          }

          if (m.winner_player_id === m.player_a_id) {
            statsA.wins++
            statsA.points += 2
            statsB.losses++
          } else if (m.winner_player_id === m.player_b_id) {
            statsB.wins++
            statsB.points += 2
            statsA.losses++
          } else if (m.result_type === 'tie') {
            statsA.ties++
            statsB.ties++
            statsA.points += 1
            statsB.points += 1
          } else if (m.result_type === 'no_result') {
            statsA.no_results++
            statsB.no_results++
            statsA.points += 1
            statsB.points += 1
          }
        }

        const allTimeStandings = Array.from(playerStats.values()).map(s => {
          const nrr = s.balls_faced > 0 && s.balls_bowled > 0
            ? Math.round(((s.runs_scored / s.balls_faced) - (s.runs_conceded / s.balls_bowled)) * 6 * 1000) / 1000
            : null

          return {
            player: s.player,
            position: 0,
            matches_played: s.matches_played,
            wins: s.wins,
            losses: s.losses,
            ties: s.ties,
            no_results: s.no_results,
            points: s.points,
            runs_scored: s.runs_scored,
            runs_conceded: s.runs_conceded,
            wickets_lost: s.wickets_lost,
            wickets_taken: s.wickets_taken,
            balls_faced: s.balls_faced,
            balls_bowled: s.balls_bowled,
            nrr,
            qualified: null,
          }
        })

        allTimeStandings.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          if (a.nrr !== null && b.nrr !== null) return b.nrr - a.nrr
          return 0
        })

        allTimeStandings.forEach((s, i) => { s.position = i + 1 })
        setStandings(prev => ({ ...prev, 'all-time': allTimeStandings }))
      }

    } catch (error) {
      console.error('Error loading standings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Standings</h1>
          <p className="text-slate-400">View tournament and all-time standings</p>
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  const availableTabs = ['all-time', ...tournaments.filter(t => ['active', 'completed'].includes(t.status)).map(t => t.id)]
  const currentTab = availableTabs.includes(activeTab) ? activeTab : availableTabs[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Standings</h1>
          <p className="text-slate-400">View tournament and all-time standings</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue={currentTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-900/50">
          <TabsTrigger value="all-time">
            <TrendingUp className="mr-2 h-4 w-4" />
            All-Time
          </TabsTrigger>
          {tournaments
            .filter(t => ['active', 'completed'].includes(t.status))
            .map(t => (
              <TabsTrigger key={t.id} value={t.id}>
                <Trophy className="mr-2 h-4 w-4" />
                {t.name}
              </TabsTrigger>
            ))}
        </TabsList>

        {availableTabs.map((tabId) => {
          const isAllTime = tabId === 'all-time'
          const tournament = isAllTime ? null : tournaments.find(t => t.id === tabId)
          const tabStandings = standings[tabId] || []

          const renderTabContent = () => {
            if (tabStandings.length === 0) {
              return (
                <Card>
                  <CardContent className="py-12">
                    <div className="empty-state">
                      <Trophy className="empty-state-icon h-12 w-12" />
                      <h3 className="empty-state-title">No standings available</h3>
                      <p className="empty-state-description">
                        {isAllTime 
                          ? 'Play some matches to see all-time standings.'
                          : 'Complete league matches to see tournament standings.'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            return (
              <div className="space-y-6">
                {/* Standings Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>
                      {isAllTime ? 'All-Time Club Standings' : `${tournament?.name} Standings`}
                    </CardTitle>
                    {tournament?.has_final && (
                      <Badge className="badge-yellow">
                        Top {tournament.qualifiers_count} qualify for final
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ScrollArea>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pos</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead className="text-center">P</TableHead>
                            <TableHead className="text-center">W</TableHead>
                            <TableHead className="text-center">L</TableHead>
                            <TableHead className="text-center">T</TableHead>
                            <TableHead className="text-center">NR</TableHead>
                            <TableHead className="text-center">Pts</TableHead>
                            <TableHead className="text-center">Runs</TableHead>
                            <TableHead className="text-center">NRR</TableHead>
                            {tournament?.has_final && <TableHead>Qualify</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tabStandings.map(standing => (
                            <TableRow key={standing.player.id} className={cn(
                              standing.qualified === true && 'bg-green-600/10',
                              standing.qualified === false && 'bg-red-600/5'
                            )}>
                              <TableCell className="font-mono font-bold text-center">
                                {standing.position}
                              </TableCell>
                              <TableCell className="font-medium text-white">
                                {standing.player.display_name}
                              </TableCell>
                              <TableCell className="text-center font-mono">{standing.matches_played}</TableCell>
                              <TableCell className="text-center font-mono text-green-400">{standing.wins}</TableCell>
                              <TableCell className="text-center font-mono text-red-400">{standing.losses}</TableCell>
                              <TableCell className="text-center font-mono text-yellow-400">{standing.ties}</TableCell>
                              <TableCell className="text-center font-mono text-slate-400">{standing.no_results}</TableCell>
                              <TableCell className="text-center font-mono font-bold text-white">{standing.points}</TableCell>
                              <TableCell className="text-center font-mono">
                                {standing.runs_scored}/{standing.runs_conceded}
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {standing.nrr !== null 
                                  ? (standing.nrr > 0 ? '+' : '') + standing.nrr.toFixed(3)
                                  : '—'}
                              </TableCell>
                              {tournament?.has_final && (
                                <TableCell className="text-center">
                                  {standing.qualified === true && (
                                    <Badge className="badge-green">✓ Qualified</Badge>
                                  )}
                                  {standing.qualified === false && (
                                    <Badge className="badge-red">Eliminated</Badge>
                                  )}
                                  {standing.qualified === null && (
                                    <Badge className="badge-slate">—</Badge>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Tournament Info */}
                {tournament && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Tournament Info</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 rounded-lg bg-slate-800/50">
                        <p className="text-sm text-slate-400">Format</p>
                        <p className="font-medium text-white capitalize">{tournament.format.replace('_', ' ')}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50">
                        <p className="text-sm text-slate-400">Points System</p>
                        <p className="font-medium text-white">
                          Win: {tournament.points_for_win} · Tie: {tournament.points_for_tie} · NR: {tournament.points_for_no_result}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50">
                        <p className="text-sm text-slate-400">Status</p>
                        <Badge className={cn(
                          tournament.status === 'active' ? 'badge-green' :
                          tournament.status === 'completed' ? 'badge-yellow' : 'badge-slate'
                        )}>
                          {tournament.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          }

          return (
            <TabsContent key={tabId} value={tabId}>
              {renderTabContent()}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}