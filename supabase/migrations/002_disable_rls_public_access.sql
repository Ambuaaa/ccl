-- Disable Row Level Security (RLS) on all league tables
-- This allows anyone with the link to view, log, and update matches without logging in.

ALTER TABLE clubs DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE banter_messages DISABLE ROW LEVEL SECURITY;

-- Ensure the default club exists
INSERT INTO clubs (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Cousins Cricket League', 'ccl')
ON CONFLICT (id) DO NOTHING;

-- Grant permissions to public anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
