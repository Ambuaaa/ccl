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
  Trophy,
  Filter,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Users,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

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
  tournament_players: Array<{ player_id: string }>
  matches: Array<{ id: string; status: string; stage: string; winner_player_id: string | null }>
}

export function TournamentsClient() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clubId, setClubId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadTournaments()
  }, [])

  async function loadTournaments() {
    try {
      const targetClubId = await getClubId(supabase)
      setClubId(targetClubId)

      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_players (player_id),
          matches (id, status, stage, winner_player_id)
        `)
        .eq('club_id', targetClubId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error('Error loading tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTournaments = tournaments.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  async function deleteTournament(tournamentId: string) {
    if (!confirm('Are you sure you want to delete this tournament? This will also delete all associated matches.')) return

    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId)
      if (error) throw error
      setTournaments(tournaments.filter(t => t.id !== tournamentId))
    } catch (error) {
      console.error('Error deleting tournament:', error)
      alert('Failed to delete tournament')
    }
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, string> = {
      draft: 'badge-slate',
      upcoming: 'badge-blue',
      active: 'badge-green',
      completed: 'badge-yellow',
      archived: 'badge-slate',
    }
    return badges[status] || 'badge-slate'
  }

  function getCompletedCount(tournament: Tournament) {
    return tournament.matches.filter(m => m.status === 'completed').length
  }

  function getTotalMatches(tournament: Tournament) {
    return tournament.matches.length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tournaments</h1>
            <p className="text-slate-400">Browse all tournaments</p>
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
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="text-slate-400">Browse all tournaments</p>
        </div>
        <Button asChild variant="default" className="bg-yellow-600 hover:bg-yellow-700">
          <Link href="/tournaments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Tournament
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search tournaments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tournaments List */}
      {filteredTournaments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="empty-state">
              <Trophy className="empty-state-icon h-12 w-12" />
              <h3 className="empty-state-title">No tournaments found</h3>
              <p className="empty-state-description">
                {search ? 'Try adjusting your search.' : 'Create your first tournament to start competing.'}
              </p>
              {!search && (
                <Button asChild className="mt-4">
                  <Link href="/tournaments/new">Create Tournament</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map(tournament => {
            const completedMatches = getCompletedCount(tournament)
            const totalMatches = getTotalMatches(tournament)
            const playerCount = tournament.tournament_players.length

            return (
              <Card key={tournament.id} className="tournament-card overflow-hidden">
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-lg">{tournament.name}</h3>
                      <p className="text-sm text-slate-400">
                        {formatDate(tournament.start_date)}
                        {tournament.end_date && ` – ${formatDate(tournament.end_date)}`}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/tournaments/${tournament.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/tournaments/${tournament.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteTournament(tournament.id)}
                          className="text-red-400 focus:text-red-300 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {tournament.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{tournament.description}</p>
                  )}

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn('capitalize', getStatusBadge(tournament.status))}>
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

                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {playerCount} players
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {completedMatches}/{totalMatches} matches
                      </span>
                    </div>

                    {tournament.status === 'completed' && tournament.matches.length > 0 && (() => {
                      const finalMatch = tournament.matches.find(m => m.stage === 'final' && m.status === 'completed')
                      return (
                        <div className="pt-3 border-t border-slate-800">
                          <p className="text-sm text-slate-400">Final Result</p>
                          {finalMatch && (
                            <p className="text-green-400 font-medium">
                              Winner: {finalMatch.winner_player_id ? 'Decided' : 'TBD'}
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  <Button asChild variant="default" className="w-full" style={{ backgroundColor: tournament.status === 'completed' ? '#f59e0b' : '#16a34a' }}>
                    <Link href={`/tournaments/${tournament.id}`}>
                      {tournament.status === 'completed' ? 'View Results' : 'View Tournament'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}