-- Cousins Cricket League Database Schema
-- Version 1.0 - Initial schema


-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clubs table
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_club_id ON players(club_id);
CREATE UNIQUE INDEX idx_players_user_id ON players(user_id) WHERE user_id IS NOT NULL;

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT,
  session_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'archived')),
  session_type TEXT NOT NULL DEFAULT 'casual' CHECK (session_type IN ('casual', 'tournament')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_club_id ON sessions(club_id);
CREATE INDEX idx_sessions_session_date ON sessions(session_date DESC);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Session players join table
CREATE TABLE session_players (
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, player_id)
);

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  format TEXT NOT NULL DEFAULT 'single_round_robin_final' CHECK (format IN ('single_round_robin_final', 'double_round_robin_final', 'custom')),
  has_final BOOLEAN NOT NULL DEFAULT TRUE,
  qualifiers_count INTEGER NOT NULL DEFAULT 2,
  points_for_win INTEGER NOT NULL DEFAULT 2,
  points_for_tie INTEGER NOT NULL DEFAULT 1,
  points_for_no_result INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'upcoming', 'active', 'completed', 'archived')),
  rules_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tournaments_club_id ON tournaments(club_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);

-- Link sessions to an optional tournament (tournament play nights)
ALTER TABLE sessions
  ADD COLUMN tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL;
CREATE INDEX idx_sessions_tournament_id ON sessions(tournament_id);

-- Tournament players join table
CREATE TABLE tournament_players (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, player_id)
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'casual' CHECK (stage IN ('casual', 'league', 'semifinal', 'final', 'custom')),
  round_number INTEGER,
  fixture_label TEXT,
  player_a_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_b_id UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'abandoned', 'no_result')),
  player_a_runs INTEGER CHECK (player_a_runs >= 0),
  player_a_wickets INTEGER CHECK (player_a_wickets >= 0 AND player_a_wickets <= 10),
  player_a_balls_faced INTEGER CHECK (player_a_balls_faced >= 0),
  player_b_runs INTEGER CHECK (player_b_runs >= 0),
  player_b_wickets INTEGER CHECK (player_b_wickets >= 0 AND player_b_wickets <= 10),
  player_b_balls_faced INTEGER CHECK (player_b_balls_faced >= 0),
  winner_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  result_type TEXT CHECK (result_type IN ('player_a_win', 'player_b_win', 'tie', 'no_result', 'abandoned')),
  result_margin_runs INTEGER CHECK (result_margin_runs >= 0),
  result_margin_wickets INTEGER CHECK (result_margin_wickets >= 0 AND result_margin_wickets <= 10),
  player_of_match_id UUID REFERENCES players(id) ON DELETE SET NULL,
  notes TEXT,
  entered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT different_players CHECK (player_a_id != player_b_id),
  CONSTRAINT winner_is_participant CHECK (
    winner_player_id IS NULL OR 
    winner_player_id = player_a_id OR 
    winner_player_id = player_b_id
  ),
  CONSTRAINT pom_is_participant CHECK (
    player_of_match_id IS NULL OR 
    player_of_match_id = player_a_id OR 
    player_of_match_id = player_b_id
  )
);

CREATE INDEX idx_matches_club_id ON matches(club_id);
CREATE INDEX idx_matches_session_id ON matches(session_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_player_a_id ON matches(player_a_id);
CREATE INDEX idx_matches_player_b_id ON matches(player_b_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_played_at ON matches(played_at DESC);

-- Match predictions (optional future feature)
CREATE TABLE match_predictions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  predicted_winner_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  UNIQUE(match_id, player_id)
);

-- Banter messages (optional future feature)
CREATE TABLE banter_messages (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  author_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banter_club_id ON banter_messages(club_id);
CREATE INDEX idx_banter_created_at ON banter_messages(created_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banter_updated_at BEFORE UPDATE ON banter_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banter_messages ENABLE ROW LEVEL SECURITY;

-- Helper to resolve the current user's clubs without triggering recursive RLS
CREATE OR REPLACE FUNCTION public.current_club_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT club_id FROM players WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_club_ids() TO authenticated;

-- Policies: Club members can view their club's data
CREATE POLICY "Club members can view club" ON clubs FOR SELECT USING (
  id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can view players" ON players FOR SELECT USING (
  club_id IN (SELECT public.current_club_ids()) OR user_id = auth.uid()
);

CREATE POLICY "Members can insert players" ON players FOR INSERT WITH CHECK (
  club_id IN (SELECT public.current_club_ids()) OR user_id = auth.uid()
);

CREATE POLICY "Members can update players" ON players FOR UPDATE USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Members can delete players" ON players FOR DELETE USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Authenticated users can create clubs" ON clubs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Club members can update club" ON clubs FOR UPDATE USING (
  id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can view sessions" ON sessions FOR SELECT USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can view session_players" ON session_players FOR SELECT USING (
  session_id IN (SELECT id FROM sessions WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can view tournaments" ON tournaments FOR SELECT USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can view tournament_players" ON tournament_players FOR SELECT USING (
  tournament_id IN (SELECT id FROM tournaments WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can view matches" ON matches FOR SELECT USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can view predictions" ON match_predictions FOR SELECT USING (
  match_id IN (SELECT id FROM matches WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can view banter" ON banter_messages FOR SELECT USING (
  club_id IN (SELECT public.current_club_ids())
);

-- Policies: Authenticated users can insert/update their club's data
CREATE POLICY "Club members can insert sessions" ON sessions FOR INSERT WITH CHECK (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can update sessions" ON sessions FOR UPDATE USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can insert session_players" ON session_players FOR INSERT WITH CHECK (
  session_id IN (SELECT id FROM sessions WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can insert tournaments" ON tournaments FOR INSERT WITH CHECK (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can update tournaments" ON tournaments FOR UPDATE USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can insert tournament_players" ON tournament_players FOR INSERT WITH CHECK (
  tournament_id IN (SELECT id FROM tournaments WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can insert matches" ON matches FOR INSERT WITH CHECK (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can update matches" ON matches FOR UPDATE USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can insert predictions" ON match_predictions FOR INSERT WITH CHECK (
  match_id IN (SELECT id FROM matches WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can insert banter" ON banter_messages FOR INSERT WITH CHECK (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Authors can update own banter" ON banter_messages FOR UPDATE USING (
  author_player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
);

CREATE POLICY "Authors can delete own banter" ON banter_messages FOR DELETE USING (
  author_player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
);

-- Policies: Delete permissions for club members
CREATE POLICY "Club members can delete sessions" ON sessions FOR DELETE USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can delete session_players" ON session_players FOR DELETE USING (
  session_id IN (SELECT id FROM sessions WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can delete tournaments" ON tournaments FOR DELETE USING (
  club_id IN (SELECT public.current_club_ids())
);

CREATE POLICY "Club members can delete tournament_players" ON tournament_players FOR DELETE USING (
  tournament_id IN (SELECT id FROM tournaments WHERE club_id IN (SELECT public.current_club_ids()))
);

CREATE POLICY "Club members can delete matches" ON matches FOR DELETE USING (
  club_id IN (SELECT public.current_club_ids())
);

-- Onboarding: create/join the club and link a player profile to the current user.
-- SECURITY DEFINER so the very first user (who is not yet a club member) can bootstrap.
CREATE OR REPLACE FUNCTION public.ensure_player_profile(p_display_name TEXT)
RETURNS players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_player players;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_player FROM players WHERE user_id = auth.uid() LIMIT 1;
  IF FOUND THEN
    RETURN v_player;
  END IF;

  SELECT id INTO v_club_id FROM clubs ORDER BY created_at ASC LIMIT 1;
  IF v_club_id IS NULL THEN
    INSERT INTO clubs (name, slug)
    VALUES ('Cousins Cricket League', 'ccl')
    RETURNING id INTO v_club_id;
  END IF;

  -- Claim an existing unowned profile with the same name (e.g. added by another cousin)
  SELECT * INTO v_player
  FROM players
  WHERE club_id = v_club_id
    AND user_id IS NULL
    AND lower(trim(display_name)) = lower(trim(p_display_name))
  LIMIT 1;

  IF FOUND THEN
    UPDATE players SET user_id = auth.uid() WHERE id = v_player.id
    RETURNING * INTO v_player;
    RETURN v_player;
  END IF;

  INSERT INTO players (club_id, display_name, user_id, is_active)
  VALUES (v_club_id, COALESCE(NULLIF(trim(p_display_name), ''), 'New Player'), auth.uid(), TRUE)
  RETURNING * INTO v_player;

  RETURN v_player;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_player_profile(TEXT) TO authenticated;