-- Development seed data for Cousins Cricket League
-- Run this after migrations in local development

-- Create a club
INSERT INTO clubs (id, name, slug) VALUES 
('00000000-0000-0000-0000-000000000001', 'Cousins Cricket League', 'ccl')
ON CONFLICT (id) DO NOTHING;

-- Note: Players will be created when users sign up and link their accounts
-- This seed file just ensures the club exists
-- The three cousins will each sign up via magic link and their player profiles will be created