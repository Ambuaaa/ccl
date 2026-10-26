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
  Calendar,
  Target,
  Trophy,
  ChevronRight,
  MoreVertical,
} from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

interface Match {
  id: string
  status: string
  stage: string
  round_number: number | null
  fixture_label: string | null
  scheduled_at: string | null
  played_at: string | null
  created_at: string
  player_a_runs: number | null
  player_b_runs: number | null
  player_a_wickets: number | null
  player_b_wickets: number | null
  winner_player_id: string | null
  result_type: string | null
  result_margin_runs: number | null
  result_margin_wickets: number | null
  player_a: { id: string; display_name: string }
  player_b: { id: string; display_name: string }
  winner: { display_name: string } | null
  session: { id: string; title: string | null; session_date: string }
  tournament: { id: string; name: string } | null
}

export function FixturesClient() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadFixtures()
  }, [])

  async function loadFixtures() {
    try {
      const targetClubId = await getClubId(supabase)
      setClubId(targetClubId)

      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          player_a:players!matches_player_a_id_fkey (id, display_name),
          player_b:players!matches_player_b_id_fkey (id, display_name),
          winner:players!matches_winner_player_id_fkey (display_name),
          session:sessions (id, title, session_date),
          tournament:tournaments (id, name)
        `)
        .eq('club_id', targetClubId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMatches(data || [])
    } catch (error) {
      console.error('Error loading fixtures:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fixtures & Results</h1>
          <p className="text-slate-400">View all matches and fixtures</p>
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  const upcomingMatches = matches.filter(m => ['scheduled', 'in_progress'].includes(m.status))
  const completedMatches = matches.filter(m => m.status === 'completed')
  const cancelledMatches = matches.filter(m => ['abandoned', 'no_result'].includes(m.status))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Fixtures & Results</h1>
        <p className="text-slate-400">View all matches and fixtures</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-white">{matches.length}</p>
            <p className="text-sm text-slate-400">Total Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-yellow-400">{upcomingMatches.length}</p>
            <p className="text-sm text-slate-400">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-green-400">{completedMatches.length}</p>
            <p className="text-sm text-slate-400">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-slate-900/50">
          <TabsTrigger value="all">All Matches</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingMatches.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedMatches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map(match => (
                      <TableRow key={match.id} className={cn(
                        match.status === 'completed' && match.winner_player_id && 'winner-row'
                      )}>
                        <TableCell className="font-mono text-slate-300">
                          {formatDate(match.session?.session_date || match.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            match.stage === 'league' ? 'badge-blue' :
                            match.stage === 'final' ? 'badge-yellow' :
                            match.stage === 'semifinal' ? 'badge-purple' : 'badge-slate'
                          )}>
                            {match.fixture_label || `R${match.round_number}`}
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
                          {match.status === 'completed' ? (
                            <Badge className={cn(
                              match.result_type === 'tie' ? 'badge-yellow' :
                              match.winner_player_id ? 'badge-green' : 'badge-red'
                            )}>
                              {match.winner?.display_name || 'Tied'}
                              {match.result_margin_runs && ` (${match.result_margin_runs} runs)`}
                              {match.result_margin_wickets && ` (${match.result_margin_wickets} wkts)`}
                            </Badge>
                          ) : (
                            <Badge className={cn(
                              match.status === 'in_progress' ? 'badge-yellow' :
                              match.status === 'scheduled' ? 'badge-slate' :
                              'badge-red'
                            )}>
                              {match.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-400">
                            {match.session?.title || formatDate(match.session?.session_date || '')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {match.status === 'completed' && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/matches/${match.id}`}>View Scorecard</Link>
                                </DropdownMenuItem>
                              )}
                              {!['completed', 'abandoned'].includes(match.status) && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/matches/${match.id}/edit`}>Enter Result</Link>
                                </DropdownMenuItem>
                              )}
                              {match.tournament && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href={`/tournaments/${match.tournament.id}`}>
                                      View Tournament
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          {upcomingMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="empty-state">
                  <Calendar className="empty-state-icon h-12 w-12" />
                  <h3 className="empty-state-title">No upcoming matches</h3>
                  <p className="empty-state-description">All matches have been played or cancelled.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingMatches.map(match => (
                        <TableRow key={match.id}>
                          <TableCell className="font-mono text-slate-300">
                            {formatDate(match.session?.session_date || match.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              match.stage === 'league' ? 'badge-blue' :
                              match.stage === 'final' ? 'badge-yellow' :
                              match.stage === 'semifinal' ? 'badge-purple' : 'badge-slate'
                            )}>
                              {match.fixture_label || `R${match.round_number}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{match.player_a.display_name}</span>
                              <span className="text-slate-600">vs</span>
                              <span className="font-medium text-white">{match.player_b.display_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-400">
                              {match.session?.title || formatDate(match.session?.session_date || '')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/matches/${match.id}/edit`}>Enter Result</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedMatches.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="empty-state">
                  <Target className="empty-state-icon h-12 w-12" />
                  <h3 className="empty-state-title">No completed matches</h3>
                  <p className="empty-state-description">Play some matches to see results here.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead>Margin</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedMatches.map(match => {
                        const margin = match.result_margin_runs
                          ? `${match.result_margin_runs} runs`
                          : match.result_margin_wickets
                            ? `${match.result_margin_wickets} wkts`
                            : '—'

                        return (
                          <TableRow key={match.id} className={cn(
                            match.winner_player_id && 'winner-row'
                          )}>
                            <TableCell className="font-mono text-slate-300">
                              {formatDate(match.session?.session_date || match.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                match.stage === 'league' ? 'badge-blue' :
                                match.stage === 'final' ? 'badge-yellow' :
                                match.stage === 'semifinal' ? 'badge-purple' : 'badge-slate'
                              )}>
                                {match.fixture_label || `R${match.round_number}`}
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
                              {match.player_a_runs}/{match.player_a_wickets ?? '?'} · {match.player_b_runs}/{match.player_b_wickets ?? '?'}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                match.result_type === 'tie' ? 'badge-yellow' :
                                match.winner_player_id ? 'badge-green' : 'badge-red'
                              )}>
                                {match.winner?.display_name || 'Tied'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-slate-300">{margin}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/matches/${match.id}`}>View Scorecard</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/matches/${match.id}/edit`}>
                                      Edit Result
                                    </Link>
                                  </DropdownMenuItem>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}