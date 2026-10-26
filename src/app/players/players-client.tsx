'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Search,
  Users,
  Trophy,
  Award,
  TrendingUp,
  Target,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Crown,
} from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { calculatePlayerStats } from '@/lib/actions/stats'

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
  user_id: string | null
  is_active: boolean
  created_at: string
}

interface PlayerWithStats extends Player {
  stats: {
    matches_played: number
    wins: number
    losses: number
    ties: number
    no_results: number
    win_percentage: number | null
    total_runs_scored: number
    total_runs_conceded: number
    highest_score: number
    average_runs: number | null
    current_streak: number
    longest_winning_streak: number
    recent_form: ('W' | 'L' | 'T' | 'NR')[]
    player_of_match_awards: number
  }
}

export function PlayersClient() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clubId, setClubId] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    try {
      const targetClubId = await getClubId(supabase)
      setClubId(targetClubId)

      const { data: playersData, error } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', targetClubId)
        .eq('is_active', true)
        .order('display_name')

      if (error) throw error

      // Calculate stats for each player
      const playersWithStats = await Promise.all(
        (playersData || []).map(async (player) => {
          const stats = await calculatePlayerStats(targetClubId, player.id)
          return { ...player, stats }
        })
      )

      setPlayers(playersWithStats)
    } catch (error) {
      console.error('Error loading players:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter(p => 
    p.display_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Players</h1>
            <p className="text-slate-400">View player profiles and statistics</p>
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
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="text-slate-400">View player profiles and statistics</p>
        </div>
        <Button asChild variant="default" className="bg-green-600 hover:bg-green-700">
          <Link href="/players/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Player
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 w-full h-10 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
        />
      </div>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="empty-state">
              <Users className="empty-state-icon h-12 w-12" />
              <h3 className="empty-state-title">No players found</h3>
              <p className="empty-state-description">
                {search ? 'Try adjusting your search.' : 'Add players to start tracking stats.'}
              </p>
              {!search && (
                <Button asChild className="mt-4">
                  <Link href="/players/new">Add Player</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map(player => (
            <Card key={player.id} className="hover:border-green-600/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xl text-slate-300">
                      {getInitials(player.display_name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">{player.display_name}</h3>
                      <p className="text-sm text-slate-400">
                        {player.stats.matches_played} matches · {player.stats.wins}W {player.stats.losses}L
                      </p>
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
                        <Link href={`/players/${player.id}`}>View Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/players/${player.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-2xl font-bold text-white">{player.stats.win_percentage !== null ? player.stats.win_percentage + '%' : '—'}</p>
                    <p className="text-xs text-slate-400">Win %</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-2xl font-bold text-white">{player.stats.total_runs_scored}</p>
                    <p className="text-xs text-slate-400">Runs</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-800/50">
                    <p className="text-2xl font-bold text-white">{player.stats.highest_score}</p>
                    <p className="text-xs text-slate-400">HS</p>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Matches</span>
                    <span className="font-medium text-white">{player.stats.matches_played}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Average</span>
                    <span className="font-medium text-white">{player.stats.average_runs?.toFixed(2) || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">POTM Awards</span>
                    <span className="font-medium text-white">{player.stats.player_of_match_awards}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Streak</span>
                    <span className={cn('font-medium', player.stats.current_streak > 0 ? 'text-green-400' : 'text-red-400')}>
                      {player.stats.current_streak > 0 ? 'W' : 'L'}{Math.abs(player.stats.current_streak)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Longest Streak</span>
                    <span className="font-medium text-green-400">W{player.stats.longest_winning_streak}</span>
                  </div>
                </div>

                {/* Recent Form */}
                {player.stats.recent_form.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Form:</span>
                      <div className="flex gap-1">
                        {player.stats.recent_form.slice(0, 5).map((result, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-5 w-5 rounded flex items-center justify-center text-xs font-medium',
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
                    </div>
                  </div>
                )}

                <Button asChild variant="outline" className="w-full mt-4">
                  <Link href={`/players/${player.id}`}>
                    View Profile <ChevronRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}