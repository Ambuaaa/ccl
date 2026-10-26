# Cousins Cricket League (CCL)

A private, responsive web application for tracking cricket matches, tournaments, stats, and rivalries between cousins who play EA Cricket multiplayer.

## Features

- **Persistent Sessions** - Create dated gaming sessions that persist forever
- **Match Tracking** - Record scores, wickets, overs, and results manually
- **Tournaments** - Run single/double round-robin tournaments with finals
- **Statistics** - Player profiles, head-to-head records, win percentages, streaks
- **Club Records** - Highest scores, biggest victories, closest finishes
- **Hall of Fame** - Tournament champions and runners-up history
- **Responsive Design** - Works on mobile and desktop
- **Dark Theme** - Cricket/esports inspired aesthetic

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Magic Links)
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account

### 1. Clone and Install

```bash
cd ccl
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to Settings → API to get your Project URL and anon key
3. Go to Settings → Database → Migrations and run the migration files in `supabase/migrations/`
4. (Optional) Run the seed file in `supabase/seed.sql` for development data

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. First Login

1. Go to http://localhost:3000/auth/login
2. Enter your email
3. Check your email for the magic link
4. Click the link to sign in
5. You'll be redirected to the dashboard

### 6. Set Up Your Club

After first login the app automatically opens the onboarding screen:

1. Enter the name you want to appear on scorecards.
2. The first user creates the "Cousins Cricket League" club (rename it later in Settings → Club).
3. Other cousins sign in with their emails and join the same club by entering their name.
4. Every player profile is linked to its account automatically.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, callback)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── sessions/      # Session CRUD
│   │   ├── matches/       # Match details & results
│   │   ├── tournaments/   # Tournament management
│   │   ├── players/       # Player profiles
│   │   ├── standings/     # Points tables
│   │   ├── rivalries/     # Head-to-head
│   │   ├── records/       # Club records & Hall of Fame
│   │   ├── fixtures/      # All fixtures & results
│   │   └── settings/      # Club & account settings
│   └── api/               # API routes (if needed)
├── components/
│   ├── layout/            # Sidebar, Header, MainLayout
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── actions/           # Server Actions (mutations)
│   ├── supabase/          # Supabase clients
│   ├── hooks.ts           # Client-side hooks
│   ├── types.ts           # TypeScript types
│   └── utils.ts           # Utility functions
└── proxy.ts               # Auth cookie refresh (Next.js proxy convention)
```

## Database Schema

Key tables:
- `clubs` - The league/club
- `players` - Player profiles (linked to auth users)
- `sessions` - Dated gaming sessions
- `session_players` - Many-to-many session participants
- `tournaments` - Named competitions
- `tournament_players` - Tournament participants
- `matches` - Individual cricket matches
- `match_predictions` - Pre-match predictions (future)
- `banter_messages` - Trash talk wall (future)

## Key Concepts

### Session vs Tournament
- **Session** = A single date when cousins play (e.g., "23 Oct 2026")
- **Tournament** = A named competition that can span multiple sessions
- A session can be casual OR belong to a tournament

### Match Stages
- `casual` - Friendly match, no tournament
- `league` - Round-robin league match
- `semifinal` - Knockout semi-final
- `final` - Championship final

### Points System (Configurable per Tournament)
- Win = 2 points (default)
- Tie = 1 point (default)
- No Result = 1 point (default)

## Development

### Run Tests
```bash
npm run test
```

### Lint
```bash
npm run lint
```

### Type Check
```bash
npm run typecheck
```

### Database Migrations
```bash
# Using Supabase CLI
supabase db push
```


## License

Private project for cousin cricket league. Not for public distribution.