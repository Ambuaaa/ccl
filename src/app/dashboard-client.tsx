'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Trophy,
  Calendar,
  TrendingUp,
  Award,
  Users,
  Target,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  MinusCircle,
} from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: string
  title: string | null
  session_date: string
  status: string
  session_type: string
  notes: string | null
  matches: Array<{
    id: string
    status: string
    player_a_id: string
    player_b_id: string
    winner_player_id: string | null
    result_type: string | null
    player_a_runs: number | null
    player_b_runs: number | null
    player_a_wickets: number | null
    player_b_wickets: number | null
    result_margin_runs: number | null
    result_margin_wickets: number | null
    created_at: string
    player_a: { display_name: string }
    player_b: { display_name: string }
    winner: { display_name: string } | null
  }>
  players: Array<{ id: string; display_name: string }>
}

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
}

interface ClubStats {
  total_sessions: number
  total_matches: number
  total_players: number
  recent_sessions: Session[]
  top_players: Array<Player & { wins: number; matches: number }>
  active_tournament: {
    id: string
    name: string
    status: string
    matches: Array<{ id: string; status: string }>
  } | null
}

export function DashboardClient() {
  const [stats, setStats] = useState<ClubStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const { data: club } = await supabase.from('clubs').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle()
      const targetClubId = club?.id || '00000000-0000-0000-0000-000000000001'
      setClubId(targetClubId)

      // Fetch recent sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          *,
          matches (
            id, status, player_a_id, player_b_id, winner_player_id, result_type,
            player_a_runs, player_b_runs, player_a_wickets, player_b_wickets,
            result_margin_runs, result_margin_wickets, created_at,
            player_a:players!matches_player_a_id_fkey (display_name),
            player_b:players!matches_player_b_id_fkey (display_name),
            winner:players!matches_winner_player_id_fkey (display_name)
          ),
          session_players (player_id, players:players!inner (id, display_name))
        `)
        .eq('club_id', targetClubId)
        .order('session_date', { ascending: false })

      // Fetch player stats
      const { data: players } = await supabase
        .from('players')
        .select('id, display_name, avatar_url')
        .eq('club_id', targetClubId)
        .eq('is_active', true)

      // Fetch active tournament
      const { data: tournament } = await supabase
        .from('tournaments')
        .select(`
          id, name, status,
          matches (id, status)
        `)
        .eq('club_id', targetClubId)
        .in('status', ['upcoming', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Calculate top players
      const { data: allMatches } = await supabase
        .from('matches')
        .select('player_a_id, player_b_id, winner_player_id, status')
        .eq('club_id', targetClubId)
        .eq('status', 'completed')

      const playerStats = new Map<string, { wins: number; matches: number }>()
      if (allMatches) {
        for (const m of allMatches) {
          for (const pid of [m.player_a_id, m.player_b_id]) {
            const s = playerStats.get(pid) || { wins: 0, matches: 0 }
            s.matches++
            if (m.winner_player_id === pid) s.wins++
            playerStats.set(pid, s)
          }
        }
      }

      const topPlayers = (players || [])
        .map(p => ({
          ...p,
          wins: playerStats.get(p.id)?.wins || 0,
          matches: playerStats.get(p.id)?.matches || 0,
        }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 3)

      setStats({
        total_sessions: sessions?.length || 0,
        total_matches: allMatches?.length || 0,
        total_players: players?.length || 0,
        recent_sessions: (sessions || []).slice(0, 5),
        top_players: topPlayers,
        active_tournament: tournament || null,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400">Welcome back to the Cousins Cricket League</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="skeleton h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats || !clubId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400">Welcome back to the Cousins Cricket League</p>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users className="h-12 w-12" />
          </div>
          <h3 className="empty-state-title">No club found</h3>
          <p className="empty-state-description">Sign in to join or create a club.</p>
        </div>
      </div>
    )
  }

  const latestSession = stats.recent_sessions[0]
  const completedMatches = stats.recent_sessions.flatMap(s => s.matches.filter(m => m.status === 'completed'))
  const recentResults = completedMatches.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Welcome back to the Cousins Cricket League</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="default" className="bg-green-600 hover:bg-green-700">
            <Link href="/sessions/new">
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/tournaments/new">
              <Trophy className="mr-2 h-4 w-4" />
              New Tournament
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Sessions</p>
                <p className="text-3xl font-bold text-white">{stats.total_sessions}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Matches</p>
                <p className="text-3xl font-bold text-white">{stats.total_matches}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Players</p>
                <p className="text-3xl font-bold text-white">{stats.total_players}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Tournament</p>
                <p className="text-3xl font-bold text-white">
                  {stats.active_tournament ? 1 : 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Sessions</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sessions">View All <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recent_sessions.length === 0 ? (
              <div className="empty-state py-8">
                <Calendar className="empty-state-icon h-10 w-10" />
                <h3 className="empty-state-title">No sessions yet</h3>
                <p className="empty-state-description">Create your first gaming session to get started.</p>
                <Button asChild className="mt-2">
                  <Link href="/sessions/new">Create Session</Link>
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recent_sessions.map(session => {
                      const completedMatches = session.matches.filter(m => m.status === 'completed').length
                      const totalMatches = session.matches.length
                      return (
                        <TableRow key={session.id} className="hover:bg-slate-800/50">
                          <TableCell className="font-mono text-slate-300">
                            {formatDate(session.session_date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">
                                {session.title || `Gaming Session — ${formatDate(session.session_date)}`}
                              </p>
                              {session.notes && (
                                <p className="text-xs text-slate-500 truncate max-w-xs">
                                  {session.notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              'capitalize',
                              session.session_type === 'tournament' ? 'badge-blue' : 'badge-slate'
                            )}>
                              {session.session_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {completedMatches}/{totalMatches}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('capitalize', `status-${session.status}`)}>
                              {session.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/sessions/${session.id}`}>View</Link>
                            </Button>
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

        {/* Sidebar: Active Tournament + Top Players */}
        <div className="space-y-6">
          {/* Active Tournament */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Active Tournament
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.active_tournament ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-white">{stats.active_tournament.name}</h3>
                    <p className="text-sm text-slate-400 capitalize">{stats.active_tournament.status}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {stats.active_tournament.matches.slice(0, 5).map(match => (
                      <div key={match.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Match {stats.active_tournament!.matches.indexOf(match) + 1}</span>
                        <Badge className={cn(
                          match.status === 'completed' ? 'badge-green' :
                          match.status === 'in_progress' ? 'badge-yellow' :
                          'badge-slate'
                        )}>
                          {match.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                    {stats.active_tournament.matches.length > 5 && (
                      <Button asChild variant="ghost" size="sm" className="w-full">
                        <Link href={`/tournaments/${stats.active_tournament!.id}`}>
                          View all {stats.active_tournament.matches.length} matches
                        </Link>
                      </Button>
                    )}
                  </div>
                  <Button asChild variant="default" className="w-full mt-2">
                    <Link href={`/tournaments/${stats.active_tournament.id}`}>
                      View Tournament
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="empty-state py-8">
                  <Trophy className="empty-state-icon h-10 w-10" />
                  <h3 className="empty-state-title">No active tournament</h3>
                  <p className="empty-state-description">Start a new tournament to compete for the championship.</p>
                  <Button asChild className="mt-2">
                    <Link href="/tournaments/new">Create Tournament</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.top_players.length === 0 ? (
                <div className="empty-state py-8">
                  <Users className="empty-state-icon h-10 w-10" />
                  <h3 className="empty-state-title">No players yet</h3>
                  <p className="empty-state-description">Add players to start tracking stats.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.top_players.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm',
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-slate-300/20 text-slate-300' :
                        'bg-amber-700/20 text-amber-400'
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{player.display_name}</p>
                        <p className="text-xs text-slate-500">
                          {player.wins}W · {player.matches} matches
                          {player.matches > 0 && ` · ${Math.round((player.wins / player.matches) * 100)}%`}
                        </p>
                      </div>
                      {index === 0 && (
                        <Award className="h-5 w-5 text-yellow-400" />
                      )}
                    </div>
                  ))}
                  <Button asChild variant="ghost" size="sm" className="w-full mt-2">
                    <Link href="/players">View All Players</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Latest Match Results */}
      {recentResults.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest Results</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/fixtures">View All <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentResults.map(match => {
                    const isPlayerAWinner = match.winner_player_id === match.player_a_id
                    const winnerName = match.winner?.display_name || 'Tied'
                    const margin = match.result_margin_runs
                      ? `${match.result_margin_runs} runs`
                      : match.result_margin_wickets
                        ? `${match.result_margin_wickets} wkts`
                        : match.result_type === 'tie'
                          ? 'Tied'
                          : 'N/A'

                    return (
                      <TableRow key={match.id} className={cn(
                        match.winner_player_id && 'winner-row'
                      )}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">{match.player_a.display_name}</span>
                            <span className="text-slate-600">vs</span>
                            <span className="text-slate-400 text-sm">{match.player_b.display_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {match.player_a_runs !== null && match.player_b_runs !== null ? (
                            <>
                              {match.player_a_runs}/{match.player_a_wickets ?? '?'}
                              <span className="mx-2 text-slate-500">·</span>
                              {match.player_b_runs}/{match.player_b_wickets ?? '?'}
                            </>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            match.winner_player_id ? 'badge-green' : 'badge-yellow'
                          )}>
                            {winnerName}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-300">{margin}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{formatRelativeTime(match.created_at)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}