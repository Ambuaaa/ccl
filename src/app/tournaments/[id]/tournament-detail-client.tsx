'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { formatDate, formatDateTime, formatRelativeTime, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Trophy,
  Calendar,
  Users,
  Clock,
  Flag,
  ChevronRight,
  MoreVertical,
  Save,
  AlertCircle,
  Target,
  Crown,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { updateTournament, deleteTournament, generateFixtures } from '@/lib/actions/tournaments'
import { calculateTournamentStandings } from '@/lib/actions/stats'

interface Match {
  id: string
  status: string
  stage: string
  round_number: number | null
  fixture_label: string | null
  scheduled_at: string | null
  played_at: string | null
  player_a_runs: number | null
  player_a_wickets: number | null
  player_a_balls_faced: number | null
  player_b_runs: number | null
  player_b_wickets: number | null
  player_b_balls_faced: number | null
  winner_player_id: string | null
  result_type: string | null
  result_margin_runs: number | null
  result_margin_wickets: number | null
  player_of_match_id: string | null
  player_a_id: string
  player_b_id: string
  player_a: { id: string; display_name: string; avatar_url: string | null }
  player_b: { id: string; display_name: string; avatar_url: string | null }
  winner: { id: string; display_name: string; avatar_url: string | null } | null
  player_of_match: { id: string; display_name: string; avatar_url: string | null } | null
  session: { id: string; title: string | null; session_date: string }
}

interface Tournament {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string | null
  format: string
  has_final: boolean
  qualifiers_count: number
  points_for_win: number
  points_for_tie: number
  points_for_no_result: number
  status: string
  rules_snapshot: any
  created_at: string
  tournament_players: Array<{ player_id: string; players: { id: string; display_name: string; avatar_url: string | null } }>
  matches: Match[]
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

export function TournamentDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [params])

  async function loadData() {
    try {
      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_players (player_id, players:players!inner (id, display_name, avatar_url)),
          matches (
            *,
            player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
            player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
            winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
            player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url),
            session:sessions (id, title, session_date)
          )
        `)
        .eq('id', (await params).id)
        .single()

      if (error) throw error
      setTournament(tournamentData)

      // Calculate standings if tournament is active or completed
      if (['active', 'completed'].includes(tournamentData.status)) {
        const standingsData = await calculateTournamentStandings(tournamentData.id)
        setStandings(standingsData)
      }
    } catch (error) {
      console.error('Error loading tournament:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!tournament) return

    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.append('name', tournament.name)
    formData.append('description', tournament.description || '')
    formData.append('start_date', tournament.start_date)
    formData.append('end_date', tournament.end_date || '')
    formData.append('format', tournament.format)
    formData.append('has_final', String(tournament.has_final))
    formData.append('qualifiers_count', String(tournament.qualifiers_count))
    formData.append('points_for_win', String(tournament.points_for_win))
    formData.append('points_for_tie', String(tournament.points_for_tie))
    formData.append('points_for_no_result', String(tournament.points_for_no_result))
    formData.append('status', tournament.status)
    tournament.tournament_players.forEach(tp => formData.append('player_ids', tp.player_id))

    const result = await updateTournament(tournament.id, formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setEditing(false)
      loadData()
    }
    setSaving(false)
  }

  async function handleGenerateFixtures() {
    if (!tournament) return
    if (!confirm('Generate fixtures for this tournament? This will create all league matches.')) return

    setGenerating(true)
    setError(null)

    const result = await generateFixtures(tournament.id)
    
    if (result.error) {
      setError(result.error)
    } else {
      loadData()
    }
    setGenerating(false)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all associated matches.')) return

    const result = await deleteTournament(tournament!.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/tournaments')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tournaments" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="skeleton h-8 w-48" />
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="empty-state">
        <Trophy className="empty-state-icon h-12 w-12" />
        <h3 className="empty-state-title">Tournament not found</h3>
        <p className="empty-state-description">This tournament may have been deleted.</p>
        <Button asChild className="mt-4">
          <Link href="/tournaments">Back to Tournaments</Link>
        </Button>
      </div>
    )
  }

  const completedMatches = tournament.matches.filter(m => m.status === 'completed')
  const leagueMatches = tournament.matches.filter(m => m.stage === 'league')
  const finalMatch = tournament.matches.find(m => m.stage === 'final')
  const totalPlayers = tournament.tournament_players.length

  const isCompleted = tournament.status === 'completed'
  const isActive = tournament.status === 'active'
  const isDraft = tournament.status === 'draft'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/tournaments" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
              <Badge className={cn('capitalize', 
                tournament.status === 'draft' ? 'badge-slate' :
                tournament.status === 'upcoming' ? 'badge-blue' :
                tournament.status === 'active' ? 'badge-green' :
                tournament.status === 'completed' ? 'badge-yellow' :
                'badge-slate'
              )}>
                {tournament.status}
              </Badge>
              <Badge className="badge-slate capitalize">{tournament.format.replace('_', ' ')}</Badge>
              {tournament.has_final && (
                <Badge className="badge-yellow">
                  <Trophy className="mr-1 h-3 w-3" />
                  Final
                </Badge>
              )}
            </div>
            <p className="text-slate-400">
              {formatDate(tournament.start_date)}
              {tournament.end_date && ` – ${formatDate(tournament.end_date)}`}
              · {totalPlayers} players
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && isDraft && leagueMatches.length === 0 && (
            <Button onClick={handleGenerateFixtures} disabled={generating} className="bg-green-600 hover:bg-green-700">
              <Target className="mr-2 h-4 w-4" />
              {generating ? 'Generating...' : 'Generate Fixtures'}
            </Button>
          )}
          {!editing && !isDraft && (
            <>
              <Button variant="secondary" asChild>
                <Link href={`/tournaments/${tournament.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/tournaments/new?from=current">
                  <Plus className="mr-2 h-4 w-4" />
                  New Tournament
                </Link>
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button variant="secondary" onClick={() => { setEditing(false); loadData(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Players</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{totalPlayers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">League Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {leagueMatches.filter(m => m.status === 'completed').length}/{leagueMatches.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Final</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {finalMatch?.status === 'completed' ? '✓' : finalMatch ? '○' : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={cn('text-lg', 
              tournament.status === 'completed' ? 'badge-yellow' :
              tournament.status === 'active' ? 'badge-green' :
              'badge-slate'
            )}>
              {isCompleted ? 'Champion Crowned' : isActive ? 'In Progress' : tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Champion Display */}
      {isCompleted && finalMatch && finalMatch.winner && (
        <Card className="border-yellow-600/30 bg-yellow-600/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-4">
              <Crown className="h-12 w-12 text-yellow-400" />
              <div className="text-center">
                <p className="text-sm text-slate-400">TOURNAMENT CHAMPION</p>
                <p className="text-3xl font-bold text-yellow-400">{finalMatch.winner.display_name}</p>
                <p className="text-slate-500 mt-1">
                  Won the final by {finalMatch.result_margin_runs ? `${finalMatch.result_margin_runs} runs` : finalMatch.result_margin_wickets ? `${finalMatch.result_margin_wickets} wickets` : 'unknown margin'}
                </p>
              </div>
              <Crown className="h-12 w-12 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standings Table */}
      {standings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Standings</CardTitle>
            {tournament.has_final && (
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
                    <TableHead className="text-center">NRR</TableHead>
                    <TableHead>Qualify</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map(standing => (
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
                        {standing.nrr !== null 
                          ? (standing.nrr > 0 ? '+' : '') + standing.nrr.toFixed(3)
                          : '—'}
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Matches by Stage */}
      <div className="space-y-6">
        {/* League Matches */}
        {leagueMatches.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>League Matches ({leagueMatches.filter(m => m.status === 'completed').length}/{leagueMatches.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leagueMatches
                      .sort((a, b) => (a.round_number || 0) - (b.round_number || 0))
                      .map((match, index) => {
                        const isCompleted = match.status === 'completed'
                        const winnerName = match.winner?.display_name || (match.result_type === 'tie' ? 'Tied' : '—')
                        const margin = match.result_margin_runs
                          ? `${match.result_margin_runs} runs`
                          : match.result_margin_wickets
                            ? `${match.result_margin_wickets} wkts`
                            : '—'

                        return (
                          <TableRow key={match.id} className={cn(
                            isCompleted && match.winner_player_id && 'winner-row'
                          )}>
                            <TableCell className="font-mono text-slate-400">{match.round_number || index + 1}</TableCell>
                            <TableCell>
                              <Badge className={cn(
                                match.stage === 'league' ? 'badge-blue' : 'badge-slate'
                              )}>
                                {match.fixture_label || `Match ${index + 1}`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{match.player_a.display_name}</span>
                                <span className="text-slate-600">vs</span>
                                <span className="font-medium text-white">{match.player_b.display_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {isCompleted && match.player_a_runs !== null && match.player_b_runs !== null ? (
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
                              {isCompleted ? (
                                <Badge className={cn(
                                  match.result_type === 'tie' ? 'badge-yellow' :
                                  match.winner_player_id ? 'badge-green' : 'badge-red'
                                )}>
                                  {winnerName} {margin !== '—' && `(${margin})`}
                                </Badge>
                              ) : (
                                <Badge className="badge-slate">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {match.session?.session_date ? formatDate(match.session.session_date) : 'TBD'}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {isCompleted && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/matches/${match.id}`}>View Scorecard</Link>
                                    </DropdownMenuItem>
                                  )}
                                  {!isCompleted && (
                                    <DropdownMenuItem asChild>
                                      <Link href={`/matches/${match.id}/edit`}>Enter Result</Link>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Final Match */}
        {finalMatch && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-400">FINALIST</p>
                    <p className="text-xl font-bold text-white">{finalMatch.player_a.display_name}</p>
                    {finalMatch.winner_player_id === finalMatch.player_a_id && (
                      <Badge className="badge-green mt-1">WINNER</Badge>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-slate-500">VS</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-400">FINALIST</p>
                    <p className="text-xl font-bold text-white">{finalMatch.player_b.display_name}</p>
                    {finalMatch.winner_player_id === finalMatch.player_b_id && (
                      <Badge className="badge-green mt-1">WINNER</Badge>
                    )}
                  </div>
                </div>

                {finalMatch.status === 'completed' && finalMatch.player_a_runs !== null && (
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-sm text-slate-400">{finalMatch.player_a.display_name}</p>
                      <p className="text-2xl font-bold font-mono text-white">
                        {finalMatch.player_a_runs}/{finalMatch.player_a_wickets ?? '?'}
                      </p>
                      {finalMatch.player_a_balls_faced !== null && (
                        <p className="text-sm text-slate-500">{finalMatch.player_a_balls_faced} balls</p>
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/50">
                      <p className="text-sm text-slate-400">{finalMatch.player_b.display_name}</p>
                      <p className="text-2xl font-bold font-mono text-white">
                        {finalMatch.player_b_runs}/{finalMatch.player_b_wickets ?? '?'}
                      </p>
                      {finalMatch.player_b_balls_faced !== null && (
                        <p className="text-sm text-slate-500">{finalMatch.player_b_balls_faced} balls</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center gap-4 text-sm text-slate-500">
                  {finalMatch.session && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(finalMatch.session.session_date)}
                    </span>
                  )}
                  {finalMatch.played_at && (
                    <span className="flex items-center gap-1">
                      <Flag className="h-3.5 w-3.5" />
                      {formatDateTime(finalMatch.played_at)}
                    </span>
                  )}
                </div>

                <Button asChild variant="default" className="w-full mt-4" style={{ backgroundColor: '#f59e0b' }}>
                  <Link href={`/matches/${finalMatch.id}`}>View Full Scorecard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No matches yet */}
        {leagueMatches.length === 0 && !finalMatch && isDraft && (
          <Card>
            <CardContent className="py-12">
              <div className="empty-state">
                <Target className="empty-state-icon h-12 w-12" />
                <h3 className="empty-state-title">No fixtures generated</h3>
                <p className="empty-state-description">Click "Generate Fixtures" to create the league matches for this tournament.</p>
                <Button onClick={handleGenerateFixtures} disabled={generating} className="mt-4">
                  <Target className="mr-2 h-4 w-4" />
                  {generating ? 'Generating...' : 'Generate Fixtures'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tournament Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Tournament Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Format</span>
              <span className="font-medium text-white capitalize">{tournament.format.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Final</span>
              <span className="font-medium text-white">{tournament.has_final ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Qualifiers</span>
              <span className="font-medium text-white">{tournament.qualifiers_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Points (W/T/NR)</span>
              <span className="font-medium text-white">{tournament.points_for_win}/{tournament.points_for_tie}/{tournament.points_for_no_result}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Created</span>
              <span className="font-medium text-white">{formatRelativeTime(tournament.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tournament.tournament_players.map(tp => (
                <Badge key={tp.player_id} className="badge-slate gap-1">
                  <span className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                    {tp.players.display_name[0].toUpperCase()}
                  </span>
                  {tp.players.display_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {tournament.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 whitespace-pre-wrap">{tournament.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Mode */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Tournament</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={tournament.name}
                  onChange={e => setTournament(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={tournament.description || ''}
                  onChange={e => setTournament(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={tournament.start_date}
                    onChange={e => setTournament(prev => prev ? { ...prev, start_date: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={tournament.end_date || ''}
                    onChange={e => setTournament(prev => prev ? { ...prev, end_date: e.target.value } : null)}
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={tournament.status} onValueChange={v => setTournament(prev => prev ? { ...prev, status: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => { setEditing(false); loadData(); }}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>Delete Tournament</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}