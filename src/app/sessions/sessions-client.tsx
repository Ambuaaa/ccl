'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Calendar,
  Filter,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

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
    player_a: { display_name: string }
    player_b: { display_name: string }
    winner: { display_name: string } | null
  }>
  session_players: Array<{ player_id: string; players: { id: string; display_name: string } }>
}

export function SessionsClient() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clubId, setClubId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const targetClubId = await getClubId(supabase)
      setClubId(targetClubId)

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          matches (
            id, status, player_a_id, player_b_id, winner_player_id, result_type,
            player_a_runs, player_b_runs,
            player_a:players!matches_player_a_id_fkey (display_name),
            player_b:players!matches_player_b_id_fkey (display_name),
            winner:players!matches_winner_player_id_fkey (display_name)
          ),
          session_players (player_id, players:players!inner (id, display_name))
        `)
        .eq('club_id', targetClubId)
        .order('session_date', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = sessions.filter(s => 
    (s.title || `Gaming Session — ${formatDate(s.session_date)}`).toLowerCase().includes(search.toLowerCase())
  )

  async function deleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session? This will also delete all matches in this session.')) return

    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Sessions</h1>
            <p className="text-slate-400">Browse all gaming sessions</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="skeleton h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-slate-400">Browse all gaming sessions</p>
        </div>
        <Button asChild variant="default" className="bg-green-600 hover:bg-green-700">
          <Link href="/sessions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search sessions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="empty-state">
              <Calendar className="empty-state-icon h-12 w-12" />
              <h3 className="empty-state-title">No sessions found</h3>
              <p className="empty-state-description">
                {search ? 'Try adjusting your search.' : 'Create your first gaming session to get started.'}
              </p>
              {!search && (
                <Button asChild className="mt-4">
                  <Link href="/sessions/new">Create Session</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map(session => {
            const completedMatches = session.matches.filter(m => m.status === 'completed').length
            const totalMatches = session.matches.length
            const playerNames = session.session_players.map(sp => sp.players.display_name).join(', ')

            return (
              <Card key={session.id} className="hover:border-green-600/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-green-600/20 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {session.title || `Gaming Session — ${formatDate(session.session_date)}`}
                        </h3>
                        <p className="text-sm text-slate-400">{formatDate(session.session_date)} · {formatRelativeTime(session.session_date)}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/sessions/${session.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/sessions/${session.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteSession(session.id)}
                          className="text-red-400 focus:text-red-300 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Badge className={cn('capitalize', session.session_type === 'tournament' ? 'badge-blue' : 'badge-slate')}>
                        {session.session_type}
                      </Badge>
                      <Badge className={cn('capitalize', `status-${session.status}`)}>
                        {session.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {session.notes && (
                      <p className="text-sm text-slate-500 line-clamp-2">{session.notes}</p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Users className="h-4 w-4" />
                      <span className="truncate">{playerNames || 'No players'}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between pt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">Matches:</span>
                      <span className="font-mono font-semibold text-white">{completedMatches}/{totalMatches}</span>
                    </div>
                    <Button asChild variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                      <Link href={`/sessions/${session.id}`}>
                        View <ChevronRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}