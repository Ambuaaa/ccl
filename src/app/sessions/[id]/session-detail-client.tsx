'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Users,
  Trophy,
  MoreVertical,
  Save,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { updateSession, deleteSession } from '@/lib/actions/sessions'
import { createMatch } from '@/lib/actions/matches'
import { getPlayers } from '@/lib/actions/players'

interface Match {
  id: string
  status: string
  stage: string
  round_number: number | null
  fixture_label: string | null
  player_a_id: string
  player_b_id: string
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
  notes: string | null
  player_a: { id: string; display_name: string; avatar_url: string | null }
  player_b: { id: string; display_name: string; avatar_url: string | null }
  winner: { id: string; display_name: string; avatar_url: string | null } | null
  player_of_match: { id: string; display_name: string; avatar_url: string | null } | null
}

interface Session {
  id: string
  title: string | null
  session_date: string
  status: string
  session_type: string
  notes: string | null
  tournament_id: string | null
  created_at: string
  matches: Match[]
  session_players: Array<{ player_id: string; players: { id: string; display_name: string } }>
}

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
}

export function SessionDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddMatch, setShowAddMatch] = useState(false)
  const [matchForm, setMatchForm] = useState({
    player_a_id: '',
    player_b_id: '',
    stage: 'casual' as 'casual' | 'league' | 'semifinal' | 'final',
    round_number: '',
    fixture_label: '',
  })

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

      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          *,
          matches (
            *,
            player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
            player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
            winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
            player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url)
          ),
          session_players (player_id, players:players!inner (id, display_name))
        `)
        .eq('id', (await params).id)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // Load all club players for match creation
      const playersData = await getPlayers(targetClubId)
      if (playersData) setPlayers(playersData)
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSession() {
    if (!session) return
    
    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.append('title', session.title || '')
    formData.append('session_date', session.session_date)
    formData.append('session_type', session.session_type)
    formData.append('notes', session.notes || '')
    formData.append('status', session.status)
    session.session_players.forEach(sp => formData.append('player_ids', sp.player_id))

    const result = await updateSession(session.id, formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setEditing(false)
      loadData()
    }
    setSaving(false)
  }

  async function handleDeleteSession() {
    if (!confirm('Are you sure you want to delete this session? This will also delete all matches in this session.')) return

    const result = await deleteSession(session!.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/sessions')
    }
  }

  async function handleAddMatch() {
    if (!matchForm.player_a_id || !matchForm.player_b_id) {
      setError('Please select both players')
      return
    }
    if (matchForm.player_a_id === matchForm.player_b_id) {
      setError('Players must be different')
      return
    }

    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.append('session_id', session!.id)
    formData.append('stage', matchForm.stage)
    formData.append('player_a_id', matchForm.player_a_id)
    formData.append('player_b_id', matchForm.player_b_id)
    if (matchForm.round_number) formData.append('round_number', matchForm.round_number)
    if (matchForm.fixture_label) formData.append('fixture_label', matchForm.fixture_label)
    if (session!.tournament_id) formData.append('tournament_id', session!.tournament_id)

    const result = await createMatch(formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setShowAddMatch(false)
      setMatchForm({ player_a_id: '', player_b_id: '', stage: 'casual', round_number: '', fixture_label: '' })
      loadData()
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/sessions" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="skeleton h-8 w-48" />
        </div>
        <Card className="skeleton h-64" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="empty-state">
        <Calendar className="empty-state-icon h-12 w-12" />
        <h3 className="empty-state-title">Session not found</h3>
        <p className="empty-state-description">This session may have been deleted.</p>
        <Button asChild className="mt-4">
          <Link href="/sessions">Back to Sessions</Link>
        </Button>
      </div>
    )
  }

  const completedMatches = session.matches.filter(m => m.status === 'completed')
  const pendingMatches = session.matches.filter(m => m.status === 'scheduled')
  const inProgressMatches = session.matches.filter(m => m.status === 'in_progress')

  const sessionPlayers = session.session_players.map(sp => sp.players)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/sessions" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">
                {session.title || `Gaming Session — ${formatDate(session.session_date)}`}
              </h1>
              <Badge className={cn('capitalize', `status-${session.status}`)}>
                {session.status.replace('_', ' ')}
              </Badge>
              <Badge className={cn('capitalize', session.session_type === 'tournament' ? 'badge-blue' : 'badge-slate')}>
                {session.session_type}
              </Badge>
              {session.tournament_id && (
                <Badge className="badge-purple">
                  Tournament
                </Badge>
              )}
            </div>
            <p className="text-slate-400">
              {formatDate(session.session_date)} · {sessionPlayers.map(p => p.display_name).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button variant="secondary" asChild>
                <Link href={`/sessions/${session.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button variant="secondary" onClick={() => setShowAddMatch(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Match
              </Button>
            </>
          )}
          {editing && (
            <>
              <Button variant="secondary" onClick={handleSaveSession} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="ghost" onClick={() => { setEditing(false); loadData(); }}>
                Cancel
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

      {/* Session Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatDate(session.session_date)}</p>
            <p className="text-sm text-slate-400">{formatDateTime(session.created_at)} created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Players</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{sessionPlayers.length}</p>
            <p className="text-sm text-slate-400">
              {sessionPlayers.map(p => p.display_name).join(', ') || 'None'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{session.matches.length}</p>
            <p className="text-sm text-slate-400">
              {completedMatches.length} completed · {pendingMatches.length} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {session.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 whitespace-pre-wrap">{session.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Matches */}
      <div className="space-y-6">
        {/* Completed Matches */}
        {completedMatches.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Completed Matches ({completedMatches.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>POTM</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedMatches.map((match, index) => {
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
                          <TableCell className="font-mono text-slate-400">{index + 1}</TableCell>
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
                            <Badge className={cn(
                              match.winner_player_id ? 'badge-green' : 'badge-yellow'
                            )}>
                              {winnerName}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-300">{margin}</TableCell>
                          <TableCell>
                            {match.player_of_match ? (
                              <Badge className="badge-yellow">{match.player_of_match.display_name}</Badge>
                            ) : (
                              <span className="text-slate-500 text-sm">—</span>
                            )}
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
                                  <Link href={`/matches/${match.id}`}>View Scorecard</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/matches/${match.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
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

        {/* Pending/In-Progress Matches */}
        {(pendingMatches.length > 0 || inProgressMatches.length > 0) ? (
          <>
            {inProgressMatches.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>In Progress ({inProgressMatches.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Players</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inProgressMatches.map((match, index) => (
                          <TableRow key={match.id}>
                            <TableCell className="font-mono text-slate-400">{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{match.player_a.display_name}</span>
                                <span className="text-slate-600">vs</span>
                                <span className="font-medium text-white">{match.player_b.display_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="badge-yellow">{match.stage}</Badge>
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

            {pendingMatches.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Scheduled ({pendingMatches.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Players</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingMatches.map((match, index) => (
                          <TableRow key={match.id}>
                            <TableCell className="font-mono text-slate-400">{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{match.player_a.display_name}</span>
                                <span className="text-slate-600">vs</span>
                                <span className="font-medium text-white">{match.player_b.display_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="badge-slate">{match.stage}</Badge>
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
          </>
        ) : null}

        {/* No matches */}
        {session.matches.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="empty-state">
                <Clock className="empty-state-icon h-10 w-10" />
                <h3 className="empty-state-title">No matches yet</h3>
                <p className="empty-state-description">Add matches to this session to track results.</p>
                <Button onClick={() => setShowAddMatch(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Match
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Summary */}
        {completedMatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessionPlayers.map(player => {
                  const playerMatches = completedMatches.filter(m => 
                    m.player_a_id === player.id || m.player_b_id === player.id
                  )
                  const wins = playerMatches.filter(m => m.winner_player_id === player.id).length
                  const losses = playerMatches.filter(m => m.winner_player_id && m.winner_player_id !== player.id).length
                  const ties = playerMatches.filter(m => m.result_type === 'tie').length
                  const totalRuns = playerMatches.reduce((sum, m) => {
                    const isPlayerA = m.player_a_id === player.id
                    return sum + (isPlayerA ? (m.player_a_runs || 0) : (m.player_b_runs || 0))
                  }, 0)

                  return (
                    <div key={player.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-medium">
                          {player.display_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{player.display_name}</p>
                          <p className="text-xs text-slate-500">{wins}W · {losses}L · {ties}T · {totalRuns} runs</p>
                        </div>
                      </div>
                      <Badge className={cn(wins > losses ? 'badge-green' : wins < losses ? 'badge-red' : 'badge-yellow')}>
                        {wins > losses ? 'Leading' : wins < losses ? 'Trailing' : 'Tied'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Match Dialog */}
      {showAddMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Match</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Player A</Label>
                  <Select value={matchForm.player_a_id} onValueChange={v => setMatchForm(prev => ({ ...prev, player_a_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                    <SelectContent>
                      {players.filter(p => p.id !== matchForm.player_b_id).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Player B</Label>
                  <Select value={matchForm.player_b_id} onValueChange={v => setMatchForm(prev => ({ ...prev, player_b_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                    <SelectContent>
                      {players.filter(p => p.id !== matchForm.player_a_id).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Match Type</Label>
                <Select value={matchForm.stage} onValueChange={v => setMatchForm(prev => ({ ...prev, stage: v as any }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    {session.tournament_id && (
                      <>
                        <SelectItem value="league">League</SelectItem>
                        <SelectItem value="semifinal">Semi-final</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {matchForm.stage !== 'casual' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Round Number</Label>
                    <Input
                      type="number"
                      value={matchForm.round_number}
                      onChange={e => setMatchForm(prev => ({ ...prev, round_number: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label>Fixture Label</Label>
                    <Input
                      value={matchForm.fixture_label}
                      onChange={e => setMatchForm(prev => ({ ...prev, fixture_label: e.target.value }))}
                      placeholder="Match 1"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setShowAddMatch(false)}>Cancel</Button>
                <Button onClick={handleAddMatch} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? 'Adding...' : 'Add Match'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Mode Form */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={session.title || ''}
                  onChange={e => setSession(prev => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={session.session_date}
                  onChange={e => setSession(prev => prev ? { ...prev, session_date: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={session.status} onValueChange={v => setSession(prev => prev ? { ...prev, status: v as any } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={session.notes || ''}
                  onChange={e => setSession(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => { setEditing(false); loadData(); }}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteSession} disabled={saving}>Delete Session</Button>
                <Button onClick={handleSaveSession} disabled={saving} className="bg-green-600 hover:bg-green-700">
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