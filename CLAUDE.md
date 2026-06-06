# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # start dev server on localhost:3000
npm run build     # production build
npm run lint      # ESLint
```

No test suite is configured. TypeScript type-checking runs implicitly via `next build`.

## Environment

Copy `.env.local.example` to `.env.local` and fill in three Supabase values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (used only by Edge Functions)

## Architecture

**TrackR** is a real-time GPS trip-tracking app. Users create *rooms* (shareable via a 6-char code), start *trips* inside rooms, and location points are streamed live to anyone viewing that room.

### Stack
- **Next.js 16** (App Router) + React 19 + TypeScript
- **Supabase** for auth, Postgres, Realtime, and Edge Functions
- **Leaflet** for maps (loaded async/dynamically — never import at the module level)
- **Tailwind CSS v4** with a dark design-token system via CSS custom properties (`--bg`, `--surface`, `--accent`, etc.)
- **Zustand v5** (available but not yet wired to a store file)
- **`date-fns`** for date formatting

### Data model (`supabase/migrations/001_initial.sql`)
```
rooms           — owned by a user; joined by others via `code`
trips           — one per tracking session, belongs to a room + user
location_points — raw GPS rows; pruned over time by retention tier
trip_summaries  — computed after a trip ends (start/end/waypoints/bbox)
purge_logs      — audit trail for retention pipeline runs
```

### Retention tiers
Trips age through tiers 1→4. Three Supabase Edge Functions implement the pipeline:
- `purge-downsample` (daily 02:00) — tier 1→2: keep every 5th point for trips 7–30 days old
- `purge-summarize` (daily 03:00) — tier 2→3: generate `trip_summaries`, delete raw points for trips 30–90 days old
- `purge-archive` (weekly 04:00 Sun) — tier 3→4: mark trips for deletion after `retention_days`

Cron setup SQL is in the migration file (commented out, requires `<YOUR_PROJECT_REF>` substitution).

### Auth & routing (`middleware.ts`)
Supabase SSR session is refreshed on every request via middleware. Unauthenticated users are redirected to `/auth/login`; logged-in users are redirected away from auth pages to `/dashboard`.

### Supabase client pattern
- `lib/supabase/client.ts` — browser client (`createBrowserClient`), used in Client Components
- `lib/supabase/server.ts` — async server client (`createServerClient` + cookies), used in Server Components and Route Handlers

### Key hooks (`lib/hooks/`)
- `useGeolocation` — wraps `navigator.geolocation.watchPosition` with a throttle interval (default 5 s); calls `onPosition` callback only when the interval has elapsed
- `useRealtimeTracking` — subscribes to Supabase Realtime `postgres_changes` INSERT events on `location_points` filtered by `trip_id`

### Map (`components/map/TrackingMap.tsx`)
Leaflet is imported dynamically inside a `useEffect` to avoid SSR issues. The map is dark-themed via CSS filters. Always use this component instead of importing Leaflet directly.

### Styling conventions
All colors/radii are CSS custom properties defined in `globals.css`. Use `var(--accent)`, `var(--surface)`, etc. — do not hardcode hex values. The `.mono` utility class applies `Space Mono` font. Tailwind v4 uses `@tailwind` directives and PostCSS via `@tailwindcss/postcss`.
