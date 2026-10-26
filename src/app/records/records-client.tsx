'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, cn, getInitials } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trophy,
  Crown,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Users,
  Flag,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { calculateClubRecords, calculateTournamentStandings } from '@/lib/actions/stats'

interface Record {
  name: string
  value: string | number
  holder: { id: string; display_name: string; avatar_url: string | null } | null
  match_id: string | null
  description: string
}

interface Tournament {
  id: string
  name: string
  start_date: string
  end_date: string | null
  format: string
  status: string
  champion: { id: string; display_name: string } | null
  runner_up: { id: string; display_name: string } | null
  final_match: { id: string; player_a_runs: number; player_b_runs: number; winner: { display_name: string } | null } | null
}

interface HofPlayer {
  id: string
  display_name: string
}

interface HofMatch {
  id: string
  stage: string
  status: string
  player_a_id: string
  player_b_id: string
  player_a_runs: number | null
  player_b_runs: number | null
  winner: HofPlayer | null
  player_a: HofPlayer | null
  player_b: HofPlayer | null
}

interface HofTournament {
  id: string
  name: string
  start_date: string
  end_date: string | null
  format: string
  status: string
  matches: HofMatch[]
}

export function RecordsClient() {
  const [records, setRecords] = useState<Record[]>([])
  const [hallOfFame, setHallOfFame] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<string | null>(null)
  
  // Create Supabase client directly here since we can't import from hooks
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

      // Load club records
      const recordsData = await calculateClubRecords(targetClubId)
      setRecords(recordsData)

      // Load completed tournaments for Hall of Fame
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select(`
          id, name, start_date, end_date, format, status,
          matches!inner (
            id, stage, status, player_a_id, player_b_id, player_a_runs, player_b_runs,
            winner:players!matches_winner_player_id_fkey (id, display_name),
            player_a:players!matches_player_a_id_fkey (id, display_name),
            player_b:players!matches_player_b_id_fkey (id, display_name)
          )
        `)
        .eq('club_id', targetClubId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (tournaments) {
        const rows = tournaments as unknown as HofTournament[]
        const hof: Tournament[] = []

        for (const t of rows) {
          const finalMatch = t.matches.find(m => m.stage === 'final' && m.status === 'completed') || null
          let champion = finalMatch?.winner ?? null
          let runnerUp = finalMatch
            ? (champion?.id === finalMatch.player_a_id ? finalMatch.player_b : finalMatch.player_a)
            : null

          // Tournaments decided on the table (no final) crown the standings leader
          if (!champion) {
            const standings = await calculateTournamentStandings(t.id)
            if (standings.length > 0) {
              champion = {
                id: standings[0].player.id,
                display_name: standings[0].player.display_name,
              }
              if (standings[1]) {
                runnerUp = {
                  id: standings[1].player.id,
                  display_name: standings[1].player.display_name,
                }
              }
            }
          }

          hof.push({
            id: t.id,
            name: t.name,
            start_date: t.start_date,
            end_date: t.end_date,
            format: t.format,
            status: t.status,
            champion,
            runner_up: runnerUp || null,
            final_match: finalMatch
              ? {
                  id: finalMatch.id,
                  player_a_runs: finalMatch.player_a_runs ?? 0,
                  player_b_runs: finalMatch.player_b_runs ?? 0,
                  winner: finalMatch.winner,
                }
              : null,
          })
        }
        setHallOfFame(hof)
      }
    } catch (error) {
      console.error('Error loading records:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Records & Hall of Fame</h1>
          <p className="text-slate-400">Club records and tournament history</p>
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Records & Hall of Fame</h1>
        <p className="text-slate-400">Club records and tournament history</p>
      </div>

      {/* Club Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Club Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="empty-state py-8">
              <Target className="empty-state-icon h-12 w-12" />
              <h3 className="empty-state-title">No records yet</h3>
              <p className="empty-state-description">Play matches to set club records.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {records.map(record => (
                <div key={record.name} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-green-600/50 transition-colors">
                  <p className="text-sm text-slate-400 mb-1">{record.name}</p>
                  <p className="text-2xl font-bold text-white">{record.value}</p>
                  {record.holder && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium">
                        {getInitials(record.holder.display_name)}
                      </div>
                      <span className="text-sm text-slate-300">{record.holder.display_name}</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{record.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hall of Fame */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            Hall of Fame
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hallOfFame.length === 0 ? (
            <div className="empty-state py-8">
              <Crown className="empty-state-icon h-12 w-12" />
              <h3 className="empty-state-title">No tournaments completed yet</h3>
              <p className="empty-state-description">Complete a tournament to see it in the Hall of Fame.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hallOfFame.map((tournament, index) => (
                <div key={tournament.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-yellow-600/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'h-12 w-12 rounded-full flex items-center justify-center font-bold text-xl',
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-slate-300/20 text-slate-300' :
                        'bg-amber-700/20 text-amber-400'
                      )}>
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{tournament.name}</h4>
                        <p className="text-sm text-slate-400">
                          {formatDate(tournament.start_date)}
                          {tournament.end_date && ` – ${formatDate(tournament.end_date)}`}
                          · {tournament.format.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {tournament.champion && (
                        <div>
                          <p className="text-xs text-slate-400">CHAMPION</p>
                          <p className="font-bold text-yellow-400">{tournament.champion.display_name}</p>
                        </div>
                      )}
                      {tournament.runner_up && (
                        <div>
                          <p className="text-xs text-slate-400">RUNNER-UP</p>
                          <p className="font-bold text-slate-300">{tournament.runner_up.display_name}</p>
                        </div>
                      )}
                      {tournament.final_match && tournament.final_match.winner && (
                        <Badge className="badge-yellow">
                          Final: {tournament.final_match.player_a_runs}/{tournament.final_match.player_b_runs}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}