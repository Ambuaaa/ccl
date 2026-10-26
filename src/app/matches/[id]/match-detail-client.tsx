'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, formatDateTime, ballsToOvers, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Trophy,
  Award,
  Calendar,
  Users,
  Target,
  Flag,
  ChevronLeft,
  ChevronRight,
  Save,
  AlertCircle,
  CheckCircle,
  MoreVertical,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { updateMatchResult, deleteMatch } from '@/lib/actions/matches'
import { getPlayers } from '@/lib/actions/players'

interface Match {
  id: string
  status: string
  stage: string
  round_number: number | null
  fixture_label: string | null
  scheduled_at: string | null
  played_at: string | null
  created_at: string
  player_a_id: string
  player_b_id: string
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
  session_id: string
  tournament_id: string | null
  player_a: { id: string; display_name: string; avatar_url: string | null }
  player_b: { id: string; display_name: string; avatar_url: string | null }
  winner: { id: string; display_name: string; avatar_url: string | null } | null
  player_of_match: { id: string; display_name: string; avatar_url: string | null } | null
  session: { id: string; title: string | null; session_date: string }
  tournament: { id: string; name: string } | null
}

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
}

export function MatchDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
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
      const targetClubId = await getClubId(supabase)

      const { data: matchData, error: matchError } = await supabase
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
        .eq('id', (await params).id)
        .single()

      if (matchError) throw matchError
      setMatch(matchData)

      const playersData = await getPlayers(targetClubId)
      if (playersData) setPlayers(playersData)
    } catch (error) {
      console.error('Error loading match:', error)
    } finally {
      setLoading(false)
    }
  }

  function getDefaultResultType() {
    if (!match || match.player_a_runs === null || match.player_b_runs === null) return 'player_a_win'
    if (match.player_a_runs > match.player_b_runs) return 'player_a_win'
    if (match.player_b_runs > match.player_a_runs) return 'player_b_win'
    return 'tie'
  }

  function getDefaultWinner() {
    const resultType = getDefaultResultType()
    if (resultType === 'player_a_win') return match?.player_a_id
    if (resultType === 'player_b_win') return match?.player_b_id
    return ''
  }

  function getDefaultMargin() {
    if (!match || match.player_a_runs === null || match.player_b_runs === null) return { runs: 0, wickets: 0 }
    const diff = Math.abs((match.player_a_runs || 0) - (match.player_b_runs || 0))
    if (match.player_a_runs > match.player_b_runs) return { runs: diff, wickets: 0 }
    if (match.player_b_runs > match.player_a_runs) return { runs: diff, wickets: 0 }
    return { runs: 0, wickets: 0 }
  }

  const [formData, setFormData] = useState({
    player_a_runs: match?.player_a_runs ?? '',
    player_a_wickets: match?.player_a_wickets ?? '',
    player_a_balls_faced: match?.player_a_balls_faced ?? '',
    player_b_runs: match?.player_b_runs ?? '',
    player_b_wickets: match?.player_b_wickets ?? '',
    player_b_balls_faced: match?.player_b_balls_faced ?? '',
    winner_player_id: match?.winner_player_id || getDefaultWinner(),
    result_type: match?.result_type || getDefaultResultType(),
    result_margin_runs: match?.result_margin_runs ?? getDefaultMargin().runs,
    result_margin_wickets: match?.result_margin_wickets ?? getDefaultMargin().wickets,
    player_of_match_id: match?.player_of_match_id || '',
    notes: match?.notes || '',
    status: match?.status === 'completed' ? 'completed' : 'completed',
  })

  // Update form data when match loads
  useEffect(() => {
    if (match) {
      setFormData({
        player_a_runs: match.player_a_runs ?? '',
        player_a_wickets: match.player_a_wickets ?? '',
        player_a_balls_faced: match.player_a_balls_faced ?? '',
        player_b_runs: match.player_b_runs ?? '',
        player_b_wickets: match.player_b_wickets ?? '',
        player_b_balls_faced: match.player_b_balls_faced ?? '',
        winner_player_id: match.winner_player_id || getDefaultWinner(),
        result_type: match.result_type || getDefaultResultType(),
        result_margin_runs: match.result_margin_runs ?? getDefaultMargin().runs,
        result_margin_wickets: match.result_margin_wickets ?? getDefaultMargin().wickets,
        player_of_match_id: match.player_of_match_id || '',
        notes: match.notes || '',
        status: match.status === 'completed' ? 'completed' : 'completed',
      })
    }
  }, [match])

  async function handleSave() {
    if (!match) return

    setSaving(true)
    setError(null)

    const formDataObj = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        formDataObj.append(key, String(value))
      }
    })
    formDataObj.append('match_id', match.id)

    const result = await updateMatchResult(formDataObj)
    
    if (result.error) {
      setError(result.error)
    } else {
      setEditing(false)
      loadData()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) return

    const result = await deleteMatch(match!.id)
    if (result.error) {
      setError(result.error)
    } else {
      router.push(`/sessions/${match!.session_id}`)
    }
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
        <Card className="skeleton h-96" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="empty-state">
        <Target className="empty-state-icon h-12 w-12" />
        <h3 className="empty-state-title">Match not found</h3>
        <p className="empty-state-description">This match may have been deleted.</p>
        <Button asChild className="mt-4">
          <Link href="/sessions">Back to Sessions</Link>
        </Button>
      </div>
    )
  }

  const isCompleted = match.status === 'completed'
  const isTied = match.result_type === 'tie'
  const winnerName = match.winner?.display_name || (isTied ? 'Tied' : 'Unknown')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/sessions/${match.session_id}`} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">
                {match.fixture_label || `Match ${match.round_number || ''}`}
              </h1>
              <Badge className={cn(
                'capitalize',
                match.status === 'completed' ? 'badge-green' :
                match.status === 'in_progress' ? 'badge-yellow' :
                match.status === 'abandoned' ? 'badge-red' :
                match.status === 'no_result' ? 'badge-orange' :
                'badge-slate'
              )}>
                {match.status.replace('_', ' ')}
              </Badge>
              <Badge className={cn('capitalize', 
                match.stage === 'league' ? 'badge-blue' :
                match.stage === 'final' ? 'badge-yellow' :
                match.stage === 'semifinal' ? 'badge-purple' :
                'badge-slate'
              )}>
                {match.stage}
              </Badge>
            </div>
            <p className="text-slate-400">
              {match.player_a.display_name} vs {match.player_b.display_name} · {formatDate(match.session.session_date)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && match.status !== 'completed' && (
            <Button onClick={() => setEditing(true)} className="bg-green-600 hover:bg-green-700">
              Enter Result
            </Button>
          )}
          {!editing && isCompleted && (
            <Button variant="secondary" asChild>
              <Link href={`/matches/${match.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Result
              </Link>
            </Button>
          )}
          {editing && (
            <>
              <Button variant="secondary" onClick={() => { setEditing(false); loadData(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? 'Saving...' : 'Save Result'}
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

      {/* Match Header Card */}
      <Card className={cn(isCompleted && 'border-green-600/30')}>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Player A */}
            <div className={cn(
              'relative p-4 rounded-xl text-center transition-all',
              isCompleted && match.winner_player_id === match.player_a_id && 'bg-green-600/10 border-2 border-green-600/50'
            )}>
              {isCompleted && match.winner_player_id === match.player_a_id && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              )}
              <p className="text-sm text-slate-400 mb-2">PLAYER A</p>
              <p className="text-xl font-bold text-white">{match.player_a.display_name}</p>
              {isCompleted && match.player_a_runs !== null && (
                <div className="mt-4 space-y-2 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Runs</span>
                    <span className="font-mono font-bold text-white">{match.player_a_runs}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Wickets</span>
                    <span className="font-mono font-bold text-white">{match.player_a_wickets ?? '?'}</span>
                  </div>
                  {match.player_a_balls_faced !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Balls</span>
                      <span className="font-mono font-bold text-white">
                        {match.player_a_balls_faced} ({ballsToOvers(match.player_a_balls_faced)} ov)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* VS / Result */}
            <div className="flex flex-col items-center justify-center gap-4">
              {!isCompleted ? (
                <div className="text-4xl font-bold text-slate-600">VS</div>
              ) : isTied ? (
                <div className="text-center">
                  <Badge className="badge-yellow text-lg px-4 py-2">Match Tied</Badge>
                </div>
              ) : (
                <div className="text-center">
                  <Trophy className="h-10 w-10 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">WINNER</p>
                  <p className="text-xl font-bold text-green-400">{winnerName}</p>
                  <p className="text-sm text-slate-400 font-mono">
                    {match.result_margin_runs !== null
                      ? `Won by ${match.result_margin_runs} runs`
                      : match.result_margin_wickets !== null
                        ? `Won by ${match.result_margin_wickets} wickets`
                        : ''}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(match.session.session_date)}
                </span>
                {match.played_at && (
                  <span className="flex items-center gap-1">
                    <Flag className="h-3.5 w-3.5" />
                    {formatDateTime(match.played_at)}
                  </span>
                )}
                {match.tournament && (
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    {match.tournament.name}
                  </span>
                )}
              </div>
            </div>

            {/* Player B */}
            <div className={cn(
              'relative p-4 rounded-xl text-center transition-all',
              isCompleted && match.winner_player_id === match.player_b_id && 'bg-green-600/10 border-2 border-green-600/50'
            )}>
              {isCompleted && match.winner_player_id === match.player_b_id && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              )}
              <p className="text-sm text-slate-400 mb-2">PLAYER B</p>
              <p className="text-xl font-bold text-white">{match.player_b.display_name}</p>
              {isCompleted && match.player_b_runs !== null && (
                <div className="mt-4 space-y-2 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Runs</span>
                    <span className="font-mono font-bold text-white">{match.player_b_runs}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Wickets</span>
                    <span className="font-mono font-bold text-white">{match.player_b_wickets ?? '?'}</span>
                  </div>
                  {match.player_b_balls_faced !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Balls</span>
                      <span className="font-mono font-bold text-white">
                        {match.player_b_balls_faced} ({ballsToOvers(match.player_b_balls_faced)} ov)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Player of the Match */}
          {isCompleted && match.player_of_match && (
            <div className="mt-6 p-4 rounded-xl bg-yellow-600/10 border border-yellow-600/30">
              <div className="flex items-center justify-center gap-3">
                <Award className="h-6 w-6 text-yellow-400" />
                <div>
                  <p className="text-sm text-slate-400">PLAYER OF THE MATCH</p>
                  <p className="font-bold text-yellow-400">{match.player_of_match.display_name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Match Notes */}
          {match.notes && (
            <div className="mt-6 p-4 rounded-xl bg-slate-800/50">
              <p className="text-sm text-slate-400">Notes</p>
              <p className="text-slate-300 whitespace-pre-wrap mt-1">{match.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Match Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  {match.player_a.display_name}
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label>Runs</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.player_a_runs}
                      onChange={e => setFormData(prev => ({ ...prev, player_a_runs: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Wickets Lost</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.player_a_wickets}
                      onChange={e => setFormData(prev => ({ ...prev, player_a_wickets: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Balls Faced</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.player_a_balls_faced}
                      onChange={e => setFormData(prev => ({ ...prev, player_a_balls_faced: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                  {match.player_b.display_name} <ChevronRight className="h-4 w-4" />
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label>Runs</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.player_b_runs}
                      onChange={e => setFormData(prev => ({ ...prev, player_b_runs: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Wickets Lost</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.player_b_wickets}
                      onChange={e => setFormData(prev => ({ ...prev, player_b_wickets: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Balls Faced</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.player_b_balls_faced}
                      onChange={e => setFormData(prev => ({ ...prev, player_b_balls_faced: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Result Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-white">Result Details</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Result</Label>
                  <Select value={formData.result_type} onValueChange={v => setFormData(prev => ({ ...prev, result_type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player_a_win">{match.player_a.display_name} Won</SelectItem>
                      <SelectItem value="player_b_win">{match.player_b.display_name} Won</SelectItem>
                      <SelectItem value="tie">Tied</SelectItem>
                      <SelectItem value="no_result">No Result</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Winner</Label>
                  <Select
                    value={formData.winner_player_id || 'none'}
                    onValueChange={v => setFormData(prev => ({ ...prev, winner_player_id: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select winner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No winner (Tie / NR)</SelectItem>
                      <SelectItem value={match.player_a_id}>{match.player_a.display_name}</SelectItem>
                      <SelectItem value={match.player_b_id}>{match.player_b.display_name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Player of the Match</Label>
                  <Select
                    value={formData.player_of_match_id || 'none'}
                    onValueChange={v => setFormData(prev => ({ ...prev, player_of_match_id: v === 'none' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value={match.player_a_id}>{match.player_a.display_name}</SelectItem>
                      <SelectItem value={match.player_b_id}>{match.player_b.display_name}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Margin (Runs)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.result_margin_runs}
                    onChange={e => setFormData(prev => ({ ...prev, result_margin_runs: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Margin (Wickets)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.result_margin_wickets}
                    onChange={e => setFormData(prev => ({ ...prev, result_margin_wickets: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Match notes, highlights, etc."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Match Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Session</span>
              <span className="font-medium text-white">{match.session.title || formatDate(match.session.session_date)}</span>
            </div>
            {match.tournament && (
              <div className="flex justify-between">
                <span className="text-slate-400">Tournament</span>
                <span className="font-medium text-white">{match.tournament.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Stage</span>
              <span className="font-medium text-white capitalize">{match.stage}</span>
            </div>
            {match.round_number && (
              <div className="flex justify-between">
                <span className="text-slate-400">Round</span>
                <span className="font-medium text-white">{match.round_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Created</span>
              <span className="font-medium text-white">{formatDateTime(match.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/sessions/${match.session_id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Session
              </Link>
            </Button>
            {match.tournament && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/tournaments/${match.tournament.id}`}>
                  <Trophy className="mr-2 h-4 w-4" />
                  View Tournament
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <MoreVertical className="mr-2 h-4 w-4" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {match.status !== 'completed' && (
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/matches/${match.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Result
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-300 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Match
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}