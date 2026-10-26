export type Club = {
  id: string
  name: string
  slug: string | null
  created_at: string
  updated_at: string
}

export type Player = {
  id: string
  club_id: string
  display_name: string
  avatar_url: string | null
  user_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Session = {
  id: string
  club_id: string
  title: string | null
  session_date: string
  status: 'planned' | 'in_progress' | 'completed' | 'archived'
  session_type: 'casual' | 'tournament'
  notes: string | null
  tournament_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type SessionPlayer = {
  session_id: string
  player_id: string
}

export type Tournament = {
  id: string
  club_id: string
  name: string
  description: string | null
  start_date: string
  end_date: string | null
  format: 'single_round_robin_final' | 'double_round_robin_final' | 'custom'
  has_final: boolean
  qualifiers_count: number
  points_for_win: number
  points_for_tie: number
  points_for_no_result: number
  status: 'draft' | 'upcoming' | 'active' | 'completed' | 'archived'
  rules_snapshot: TournamentRulesSnapshot | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type TournamentRulesSnapshot = {
  points_for_win: number
  points_for_tie: number
  points_for_no_result: number
  tie_breakers: string[]
  has_final: boolean
  qualifiers_count: number
}

export type TournamentPlayer = {
  tournament_id: string
  player_id: string
}

export type Match = {
  id: string
  club_id: string
  session_id: string
  tournament_id: string | null
  stage: 'casual' | 'league' | 'semifinal' | 'final' | 'custom'
  round_number: number | null
  fixture_label: string | null
  player_a_id: string
  player_b_id: string
  scheduled_at: string | null
  played_at: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'abandoned' | 'no_result'
  player_a_runs: number | null
  player_a_wickets: number | null
  player_a_balls_faced: number | null
  player_b_runs: number | null
  player_b_wickets: number | null
  player_b_balls_faced: number | null
  winner_player_id: string | null
  result_type: 'player_a_win' | 'player_b_win' | 'tie' | 'no_result' | 'abandoned' | null
  result_margin_runs: number | null
  result_margin_wickets: number | null
  player_of_match_id: string | null
  notes: string | null
  entered_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type MatchWithRelations = Match & {
  player_a: Player
  player_b: Player
  winner: Player | null
  player_of_match: Player | null
  session: Session
  tournament: Tournament | null
}

export type SessionWithRelations = Session & {
  matches: MatchWithRelations[]
  players: Player[]
}

export type TournamentWithRelations = Tournament & {
  players: Player[]
  matches: MatchWithRelations[]
}

export type PlayerStats = {
  player: Player
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
  tournament_wins: number
  runner_up_finishes: number
  finals_appearances: number
  player_of_match_awards: number
}

export type HeadToHead = {
  player_a: Player
  player_b: Player
  matches_played: number
  player_a_wins: number
  player_b_wins: number
  ties: number
  no_results: number
  player_a_runs: number
  player_b_runs: number
  player_a_highest: number
  player_b_highest: number
  most_recent_match: MatchWithRelations | null
  recent_results: MatchWithRelations[]
}

export type TournamentStanding = {
  player: Player
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

export type ClubRecord = {
  name: string
  value: string | number
  holder: Player | null
  match_id: string | null
  description: string
}

export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'archived'
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'abandoned' | 'no_result'
export type TournamentStatus = 'draft' | 'upcoming' | 'active' | 'completed' | 'archived'
export type SessionType = 'casual' | 'tournament'
export type MatchStage = 'casual' | 'league' | 'semifinal' | 'final' | 'custom'
export type ResultType = 'player_a_win' | 'player_b_win' | 'tie' | 'no_result' | 'abandoned'
export type TournamentFormat = 'single_round_robin_final' | 'double_round_robin_final' | 'custom'