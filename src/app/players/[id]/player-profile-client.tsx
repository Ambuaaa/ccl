'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, formatRelativeTime, cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Trophy,
  Award,
  TrendingUp,
  Target,
  ChevronRight,
  Crown,
  Calendar,
  Users,
  Clock,
  Flag,
} from 'lucide-react'
import Link from 'next/link'
import { calculatePlayerStats, calculateHeadToHead } from '@/lib/actions/stats'

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
  user_id: string | null
  is_active: boolean
  created_at: string
}

interface Match {
  id: string
  status: string
  player_a_id: string
  player_b_id: string
  winner_player_id: string | null
  result_type: string | null
  result_margin_runs: number | null
  result_margin_wickets: number | null
  player_of_match_id: string | null
  player_a_runs: number | null
  player_b_runs: number | null
  player_a_wickets: number | null
  player_b_wickets: number | null
  player_a: { display_name: string }
  player_b: { display_name: string }
  winner: { display_name: string } | null
  session: { session_date: string }
  tournament: { name: string } | null
  created_at: string
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
  most_recent_match: Match | null
  recent_results: Match[]
}

export function PlayerProfileClient({ params }: { params: Promise<{ id: string }> }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [stats, setStats] = useState<any>(null)
  const [headToHeads, setHeadToHeads] = useState<HeadToHead[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [params])

  async function loadData() {
    try {
      const targetClubId = await getClubId(supabase)
      setClubId(targetClubId)

      // Load player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', (await params).id)
        .single()

      if (playerError) throw playerError
      setPlayer(playerData)

      // Load matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          player_a:players!matches_player_a_id_fkey (display_name),
          player_b:players!matches_player_b_id_fkey (display_name),
          winner:players!matches_winner_player_id_fkey (display_name),
          session:sessions (session_date),
          tournament:tournaments (name)
        `)
        .eq('club_id', targetClubId)
        .in('status', ['completed'])
        .or(`player_a_id.eq.${playerData.id},player_b_id.eq.${playerData.id}`)
        .order('played_at', { ascending: false })

      if (matchesError) throw matchesError
      setMatches(matchesData || [])

      // Load stats
      const statsData = await calculatePlayerStats(targetClubId, playerData.id)
      setStats(statsData)

      // Load head-to-head against other players
      const { data: otherPlayers } = await supabase
        .from('players')
        .select('id, display_name')
        .eq('club_id', targetClubId)
        .eq('is_active', true)
        .neq('id', playerData.id)

      if (otherPlayers) {
        const h2hData = await Promise.all(
          otherPlayers.map(async (opponent) => {
            const h2h = await calculateHeadToHead(targetClubId, playerData.id, opponent.id)
            return { ...h2h, player_a: { id: playerData.id, display_name: playerData.display_name }, player_b: opponent }
          })
        )
        setHeadToHeads(h2hData)
      }
    } catch (error) {
      console.error('Error loading player profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/players" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="skeleton h-8 w-48" />
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="empty-state">
        <Users className="empty-state-icon h-12 w-12" />
        <h3 className="empty-state-title">Player not found</h3>
        <p className="empty-state-description">This player may have been deleted.</p>
        <Button asChild className="mt-4">
          <Link href="/players">Back to Players</Link>
        </Button>
      </div>
    )
  }

  const completedMatches = matches.filter(m => m.status === 'completed')
  const recentMatches = completedMatches.slice(0, 10)
  const winPercentage = stats && stats.win_percentage !== null ? stats.win_percentage + '%' : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/players" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center font-bold text-2xl text-slate-300">
            {getInitials(player.display_name)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{player.display_name}</h1>
            <p className="text-slate-400">Player since {formatDate(player.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">{stats?.matches_played || 0}</p>
            <p className="text-sm text-slate-400">Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{stats?.wins || 0}</p>
            <p className="text-sm text-slate-400">Wins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-red-400">{stats?.losses || 0}</p>
            <p className="text-sm text-slate-400">Losses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-yellow-400">{winPercentage}</p>
            <p className="text-sm text-slate-400">Win %</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">{stats?.total_runs_scored || 0}</p>
            <p className="text-sm text-slate-400">Total Runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-900/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="rivalries">Rivalries</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Batting Stats */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Batting Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-2xl font-bold text-white">{stats?.total_runs_scored || 0}</p>
                    <p className="text-sm text-slate-400">Total Runs</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-2xl font-bold text-white">{stats?.highest_score || 0}</p>
                    <p className="text-sm text-slate-400">Highest Score</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-2xl font-bold text-white">{stats?.average_runs?.toFixed(2) || '—'}</p>
                    <p className="text-sm text-slate-400">Average</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                    <p className="text-2xl font-bold text-white">{stats?.matches_played || 0}</p>
                    <p className="text-sm text-slate-400">Innings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Match Record */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Match Record
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Played</span>
                  <span className="font-medium text-white">{stats?.matches_played || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Won</span>
                  <span className="font-medium text-green-400">{stats?.wins || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lost</span>
                  <span className="font-medium text-red-400">{stats?.losses || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tied</span>
                  <span className="font-medium text-yellow-400">{stats?.ties || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">No Result</span>
                  <span className="font-medium text-slate-400">{stats?.no_results || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-slate-400">Win %</span>
                  <span className="font-bold text-white">{winPercentage}</span>
                </div>
              </CardContent>
            </Card>

            {/* Streaks & Awards */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Streaks & Awards
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                  <p className={cn('text-3xl font-bold', stats?.current_streak > 0 ? 'text-green-400' : 'text-red-400')}>
                    {stats?.current_streak > 0 ? 'W' : 'L'}{Math.abs(stats?.current_streak || 0)}
                  </p>
                  <p className="text-sm text-slate-400">Current Streak</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                  <p className="text-3xl font-bold text-green-400">W{stats?.longest_winning_streak || 0}</p>
                  <p className="text-sm text-slate-400">Longest Win Streak</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 text-center">
                  <p className="text-3xl font-bold text-yellow-400">{stats?.player_of_match_awards || 0}</p>
                  <p className="text-sm text-slate-400">Player of the Match</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1">
                  {stats?.recent_form?.slice(0, 10).map((result: string, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 h-8 rounded flex items-center justify-center text-xs font-medium',
                        result === 'W' ? 'bg-green-600 text-white' :
                        result === 'L' ? 'bg-red-600 text-white' :
                        result === 'T' ? 'bg-yellow-600 text-white' :
                        'bg-slate-600 text-white'
                      )}
                    >
                      {result}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-2 text-center">
                  W = Win, L = Loss, T = Tie, NR = No Result
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches">
          <Card>
            <CardHeader>
              <CardTitle>Match History</CardTitle>
            </CardHeader>
            <CardContent>
              {recentMatches.length === 0 ? (
                <div className="empty-state py-8">
                  <Target className="empty-state-icon h-10 w-10" />
                  <h3 className="empty-state-title">No matches yet</h3>
                  <p className="empty-state-description">This player hasn't played any completed matches yet.</p>
                </div>
              ) : (
                <ScrollArea>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Margin</TableHead>
                        <TableHead>Tournament</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentMatches.map(match => {
                        const isPlayerA = match.player_a_id === player.id
                        const opponent = isPlayerA ? match.player_b : match.player_a
                        const myRuns = isPlayerA ? match.player_a_runs : match.player_b_runs
                        const oppRuns = isPlayerA ? match.player_b_runs : match.player_a_runs
                        const myWickets = isPlayerA ? match.player_a_wickets : match.player_b_wickets
                        const oppWickets = isPlayerA ? match.player_b_wickets : match.player_a_wickets
                        const isWinner = match.winner_player_id === player.id
                        const isTied = match.result_type === 'tie'
                        const margin = match.result_margin_runs
                          ? `${match.result_margin_runs} runs`
                          : match.result_margin_wickets
                            ? `${match.result_margin_wickets} wkts`
                            : '—'

                        return (
                          <TableRow key={match.id} className={cn(
                            isWinner && 'winner-row'
                          )}>
                            <TableCell className="font-mono text-slate-300">
                              {formatDate(match.session?.session_date || match.created_at)}
                            </TableCell>
                            <TableCell className="font-medium text-white">{opponent.display_name}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {myRuns !== null && oppRuns !== null
                                ? `${myRuns}/{myWickets} · ${oppRuns}/{oppWickets}`
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                isWinner ? 'badge-green' :
                                isTied ? 'badge-yellow' : 'badge-red'
                              )}>
                                {isWinner ? 'Won' : isTied ? 'Tied' : 'Lost'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-slate-300">{margin}</TableCell>
                            <TableCell>
                              {match.tournament ? (
                                <Badge className="badge-blue">{match.tournament.name}</Badge>
                              ) : (
                                <Badge className="badge-slate">Casual</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rivalries Tab */}
        <TabsContent value="rivalries">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Head-to-Head Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {headToHeads.length === 0 ? (
                <div className="empty-state py-8">
                  <Users className="empty-state-icon h-10 w-10" />
                  <h3 className="empty-state-title">No rivalries yet</h3>
                  <p className="empty-state-description">Play matches against other players to build head-to-head records.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {headToHeads.map(h2h => {
                    const opponent = h2h.player_b
                    const myWins = h2h.player_a_wins
                    const oppWins = h2h.player_b_wins
                    const total = h2h.matches_played
                    const myWinPct = total > 0 ? Math.round((myWins / total) * 100) : 0

                    return (
                      <Card key={opponent.id} className="hover:border-green-600/50 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-300">
                                {getInitials(opponent.display_name)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">{opponent.display_name}</h4>
                                <p className="text-sm text-slate-400">
                                  {total} matches · {myWins}W {oppWins}L {h2h.ties}T
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">{myWinPct}%</p>
                              <p className="text-sm text-slate-400">Win Rate</p>
                            </div>
                          </div>
                          <Separator className="my-4" />
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-400">My Runs</p>
                              <p className="font-medium text-white">{h2h.player_a_runs}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Their Runs</p>
                              <p className="font-medium text-white">{h2h.player_b_runs}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">My Highest</p>
                              <p className="font-medium text-white">{h2h.player_a_highest}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Their Highest</p>
                              <p className="font-medium text-white">{h2h.player_b_highest}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Personal Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Highest Score</p>
                  <p className="text-3xl font-bold text-white">{stats?.highest_score || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Total Runs</p>
                  <p className="text-3xl font-bold text-white">{stats?.total_runs_scored || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Batting Average</p>
                  <p className="text-3xl font-bold text-white">{stats?.average_runs?.toFixed(2) || '—'}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Most Wins in a Row</p>
                  <p className="text-3xl font-bold text-green-400">W{stats?.longest_winning_streak || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Player of the Match Awards</p>
                  <p className="text-3xl font-bold text-yellow-400">{stats?.player_of_match_awards || 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-400">Matches Played</p>
                  <p className="text-3xl font-bold text-white">{stats?.matches_played || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}