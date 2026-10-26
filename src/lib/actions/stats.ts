'use server'

import { createClient } from '@/lib/supabase/server'
import { Player, MatchWithRelations, ClubRecord, HeadToHead, TournamentRulesSnapshot, TournamentStanding } from '@/lib/types'

// Calculate player stats from matches
export async function calculatePlayerStats(clubId: string, playerId: string, tournamentId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
      player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
      winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
      player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url)
    `)
    .eq('club_id', clubId)
    .in('status', ['completed'])
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)

  if (tournamentId) {
    query = query.eq('tournament_id', tournamentId)
  }

  const { data: matches, error } = await query
  if (error) throw error

  const typedMatches = matches as MatchWithRelations[]

  let matchesPlayed = 0
  let wins = 0
  let losses = 0
  let ties = 0
  let noResults = 0
  let totalRunsScored = 0
  let totalRunsConceded = 0
  let highestScore = 0
  let totalBallsFaced = 0
  let inningsCount = 0
  let currentStreak = 0
  let longestWinningStreak = 0
  let tempStreak = 0
  const recentForm: ('W' | 'L' | 'T' | 'NR')[] = []
  let playerOfMatchAwards = 0

  // Sort matches by date (most recent first for streaks)
  const sortedMatches = [...typedMatches].sort((a, b) => 
    new Date(b.played_at || b.created_at).getTime() - new Date(a.played_at || a.created_at).getTime()
  )

  for (const match of sortedMatches) {
    const isPlayerA = match.player_a_id === playerId
    const myRuns = isPlayerA ? match.player_a_runs : match.player_b_runs
    const myWickets = isPlayerA ? match.player_a_wickets : match.player_b_wickets
    const myBalls = isPlayerA ? match.player_a_balls_faced : match.player_b_balls_faced
    const oppRuns = isPlayerA ? match.player_b_runs : match.player_a_runs

    matchesPlayed++

    if (myRuns !== null && myRuns > highestScore) {
      highestScore = myRuns
    }

    if (myRuns !== null) {
      totalRunsScored += myRuns
      totalBallsFaced += myBalls || 0
      inningsCount++
    }

    if (oppRuns !== null) {
      totalRunsConceded += oppRuns
    }

    if (match.winner_player_id === playerId) {
      wins++
      recentForm.push('W')
      tempStreak++
      longestWinningStreak = Math.max(longestWinningStreak, tempStreak)
    } else if (match.winner_player_id && match.winner_player_id !== playerId) {
      losses++
      recentForm.push('L')
      tempStreak = 0
    } else if (match.result_type === 'tie') {
      ties++
      recentForm.push('T')
      tempStreak = 0
    } else {
      noResults++
      recentForm.push('NR')
      tempStreak = 0
    }

    if (match.player_of_match_id === playerId) {
      playerOfMatchAwards++
    }
  }

  // Current streak (from most recent matches)
  for (const result of recentForm) {
    if (result === 'W') currentStreak++
    else break
  }

  const winPercentage = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 1000) / 10 : null
  const averageRuns = inningsCount > 0 ? Math.round((totalRunsScored / inningsCount) * 100) / 100 : null

  return {
    matches_played: matchesPlayed,
    wins,
    losses,
    ties,
    no_results: noResults,
    win_percentage: winPercentage,
    total_runs_scored: totalRunsScored,
    total_runs_conceded: totalRunsConceded,
    highest_score: highestScore,
    average_runs: averageRuns,
    current_streak: currentStreak,
    longest_winning_streak: longestWinningStreak,
    recent_form: recentForm.slice(0, 5),
    player_of_match_awards: playerOfMatchAwards,
  }
}

export async function calculateHeadToHead(clubId: string, playerAId: string, playerBId: string): Promise<HeadToHead> {
  const supabase = await createClient()

  const { data: playerRows } = await supabase
    .from('players')
    .select('*')
    .in('id', [playerAId, playerBId])

  const playerA = (playerRows?.find((p) => p.id === playerAId) ?? {}) as Player
  const playerB = (playerRows?.find((p) => p.id === playerBId) ?? {}) as Player

  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
      player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
      winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url),
      player_of_match:players!matches_player_of_match_id_fkey (id, display_name, avatar_url)
    `)
    .eq('club_id', clubId)
    .in('status', ['completed'])
    .or(`and(player_a_id.eq.${playerAId},player_b_id.eq.${playerBId}),and(player_a_id.eq.${playerBId},player_b_id.eq.${playerAId})`)
    .order('played_at', { ascending: false })

  if (error) throw error

  const typedMatches = matches as MatchWithRelations[]

  let playerAWins = 0
  let playerBWins = 0
  let ties = 0
  let noResults = 0
  let playerARuns = 0
  let playerBRuns = 0
  let playerAHighest = 0
  let playerBHighest = 0

  for (const match of typedMatches) {
    const isPlayerAFirst = match.player_a_id === playerAId
    const runsA = isPlayerAFirst ? match.player_a_runs : match.player_b_runs
    const runsB = isPlayerAFirst ? match.player_b_runs : match.player_a_runs

    if (runsA !== null) {
      playerARuns += runsA
      if (runsA > playerAHighest) playerAHighest = runsA
    }
    if (runsB !== null) {
      playerBRuns += runsB
      if (runsB > playerBHighest) playerBHighest = runsB
    }

    if (match.winner_player_id === playerAId) playerAWins++
    else if (match.winner_player_id === playerBId) playerBWins++
    else if (match.result_type === 'tie') ties++
    else noResults++
  }

  return {
    player_a: playerA,
    player_b: playerB,
    matches_played: typedMatches.length,
    player_a_wins: playerAWins,
    player_b_wins: playerBWins,
    ties,
    no_results: noResults,
    player_a_runs: playerARuns,
    player_b_runs: playerBRuns,
    player_a_highest: playerAHighest,
    player_b_highest: playerBHighest,
    most_recent_match: typedMatches[0] || null,
    recent_results: typedMatches.slice(0, 5),
  }
}

export async function calculateTournamentStandings(tournamentId: string) {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, rules_snapshot')
    .eq('id', tournamentId)
    .single()

  if (!tournament) throw new Error('Tournament not found')

  const rules = tournament.rules_snapshot as TournamentRulesSnapshot
  const pointsForWin = rules?.points_for_win ?? tournament.points_for_win
  const pointsForTie = rules?.points_for_tie ?? tournament.points_for_tie
  const pointsForNoResult = rules?.points_for_no_result ?? tournament.points_for_no_result

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
      player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
      winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url)
    `)
    .eq('tournament_id', tournamentId)
    .eq('stage', 'league')
    .in('status', ['completed'])

  if (!matches) return []

  const typedMatches = matches as MatchWithRelations[]

  // Get tournament players
  const { data: tournamentPlayers } = await supabase
    .from('tournament_players')
    .select('player_id, players!inner(id, display_name, avatar_url)')
    .eq('tournament_id', tournamentId)

  if (!tournamentPlayers) return []

  const playerStats = new Map<string, {
    player: Player
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
  }>()

  // Initialize stats for each player
  for (const tp of tournamentPlayers) {
    const player = tp.players as unknown as Player
    playerStats.set(player.id, {
      player,
      matches_played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      no_results: 0,
      points: 0,
      runs_scored: 0,
      runs_conceded: 0,
      wickets_lost: 0,
      wickets_taken: 0,
      balls_faced: 0,
      balls_bowled: 0,
    })
  }

  // Head-to-head wins between each pair (used as the first tie-breaker)
  const headToHead = new Map<string, number>()

  // Process matches
  for (const match of typedMatches) {
    const statsA = playerStats.get(match.player_a_id)
    const statsB = playerStats.get(match.player_b_id)

    if (!statsA || !statsB) continue

    statsA.matches_played++
    statsB.matches_played++

    // Runs and balls
    if (match.player_a_runs !== null) {
      statsA.runs_scored += match.player_a_runs
      statsB.runs_conceded += match.player_a_runs
    }
    if (match.player_b_runs !== null) {
      statsB.runs_scored += match.player_b_runs
      statsA.runs_conceded += match.player_b_runs
    }
    if (match.player_a_wickets !== null) {
      statsA.wickets_lost += match.player_a_wickets
      statsB.wickets_taken += match.player_a_wickets
    }
    if (match.player_b_wickets !== null) {
      statsB.wickets_lost += match.player_b_wickets
      statsA.wickets_taken += match.player_b_wickets
    }
    if (match.player_a_balls_faced !== null) {
      statsA.balls_faced += match.player_a_balls_faced
      statsB.balls_bowled += match.player_a_balls_faced
    }
    if (match.player_b_balls_faced !== null) {
      statsB.balls_faced += match.player_b_balls_faced
      statsA.balls_bowled += match.player_b_balls_faced
    }

    // Result
    if (match.winner_player_id === match.player_a_id) {
      statsA.wins++
      statsA.points += pointsForWin
      statsB.losses++
      headToHead.set(
        `${match.player_a_id}|${match.player_b_id}`,
        (headToHead.get(`${match.player_a_id}|${match.player_b_id}`) ?? 0) + 1
      )
    } else if (match.winner_player_id === match.player_b_id) {
      statsB.wins++
      statsB.points += pointsForWin
      statsA.losses++
      headToHead.set(
        `${match.player_b_id}|${match.player_a_id}`,
        (headToHead.get(`${match.player_b_id}|${match.player_a_id}`) ?? 0) + 1
      )
    } else if (match.result_type === 'tie') {
      statsA.ties++
      statsB.ties++
      statsA.points += pointsForTie
      statsB.points += pointsForTie
    } else if (match.result_type === 'no_result') {
      statsA.no_results++
      statsB.no_results++
      statsA.points += pointsForNoResult
      statsB.points += pointsForNoResult
    }
  }

  // Convert to array and sort
  const standings: TournamentStanding[] = Array.from(playerStats.values()).map(s => {
    const nrr = s.balls_faced > 0 && s.balls_bowled > 0
      ? Math.round(((s.runs_scored / s.balls_faced) - (s.runs_conceded / s.balls_bowled)) * 6 * 1000) / 1000
      : null

    return {
      player: s.player,
      position: 0,
      matches_played: s.matches_played,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      no_results: s.no_results,
      points: s.points,
      runs_scored: s.runs_scored,
      runs_conceded: s.runs_conceded,
      wickets_lost: s.wickets_lost,
      wickets_taken: s.wickets_taken,
      balls_faced: s.balls_faced,
      balls_bowled: s.balls_bowled,
      nrr,
      qualified: null,
    }
  })

  // Sort by points, then head-to-head, then NRR
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points

    const aWins = headToHead.get(`${a.player.id}|${b.player.id}`) ?? 0
    const bWins = headToHead.get(`${b.player.id}|${a.player.id}`) ?? 0
    if (aWins !== bWins) return bWins - aWins

    if (a.nrr !== null && b.nrr !== null) return b.nrr - a.nrr
    return 0
  })

  // Assign positions
  standings.forEach((s, i) => {
    s.position = i + 1
    if (tournament.has_final && s.position <= (tournament.qualifiers_count || 2)) {
      s.qualified = true
    } else if (tournament.has_final) {
      s.qualified = false
    }
  })

  return standings
}

export async function calculateClubRecords(clubId: string) {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey (id, display_name, avatar_url),
      player_b:players!matches_player_b_id_fkey (id, display_name, avatar_url),
      winner:players!matches_winner_player_id_fkey (id, display_name, avatar_url)
    `)
    .eq('club_id', clubId)
    .eq('status', 'completed')

  if (!matches) return []

  const typedMatches = matches as MatchWithRelations[]

  // Highest team total
  let highestTotal = 0
  let highestTotalMatch: MatchWithRelations | null = null
  let highestTotalPlayer: Player | null = null

  // Biggest victory by runs
  let biggestVictoryRuns = 0
  let biggestVictoryRunsMatch: MatchWithRelations | null = null

  // Biggest victory by wickets
  let biggestVictoryWickets = 0
  let biggestVictoryWicketsMatch: MatchWithRelations | null = null

  // Closest finish
  let closestFinishRuns = Infinity
  let closestFinishMatch: MatchWithRelations | null = null

  for (const match of typedMatches) {
    // Highest total
    if (match.player_a_runs !== null && match.player_a_runs > highestTotal) {
      highestTotal = match.player_a_runs
      highestTotalMatch = match
      highestTotalPlayer = match.player_a
    }
    if (match.player_b_runs !== null && match.player_b_runs > highestTotal) {
      highestTotal = match.player_b_runs
      highestTotalMatch = match
      highestTotalPlayer = match.player_b
    }

    // Victory margins
    if (match.result_type === 'player_a_win' || match.result_type === 'player_b_win') {
      if (match.result_margin_runs !== null && match.result_margin_runs > biggestVictoryRuns) {
        biggestVictoryRuns = match.result_margin_runs
        biggestVictoryRunsMatch = match
      }
      if (match.result_margin_wickets !== null && match.result_margin_wickets > biggestVictoryWickets) {
        biggestVictoryWickets = match.result_margin_wickets
        biggestVictoryWicketsMatch = match
      }

      // Closest finish
      const margin = match.result_margin_runs ?? match.result_margin_wickets ?? 0
      if (margin < closestFinishRuns) {
        closestFinishRuns = margin
        closestFinishMatch = match
      }
    }
  }

  const records: ClubRecord[] = [
    {
      name: 'Highest Team Total',
      value: highestTotal,
      holder: highestTotalPlayer,
      match_id: highestTotalMatch?.id ?? null,
      description: `Scored by ${highestTotalPlayer?.display_name || 'Unknown'}`,
    },
    {
      name: 'Biggest Victory (Runs)',
      value: biggestVictoryRuns,
      holder: biggestVictoryRunsMatch?.winner ?? null,
      match_id: biggestVictoryRunsMatch?.id ?? null,
      description: `${biggestVictoryRunsMatch?.winner?.display_name || 'Unknown'} won by ${biggestVictoryRuns} runs`,
    },
    {
      name: 'Biggest Victory (Wickets)',
      value: biggestVictoryWickets,
      holder: biggestVictoryWicketsMatch?.winner ?? null,
      match_id: biggestVictoryWicketsMatch?.id ?? null,
      description: `${biggestVictoryWicketsMatch?.winner?.display_name || 'Unknown'} won by ${biggestVictoryWickets} wickets`,
    },
    {
      name: 'Closest Finish',
      value: closestFinishRuns === Infinity ? 0 : closestFinishRuns,
      holder: closestFinishMatch?.winner ?? null,
      match_id: closestFinishMatch?.id ?? null,
      description: `Won by ${closestFinishRuns === Infinity ? 'N/A' : closestFinishRuns} ${closestFinishMatch?.result_margin_wickets ? 'wickets' : 'runs'}`,
    },
  ]

  return records.filter(r => Number(r.value) > 0 || r.name === 'Closest Finish')
}