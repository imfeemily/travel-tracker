# TrackR — Production Deployment Plan

## Pre-flight: Code fixes (done)

- [x] Renamed `proxy.ts` → `middleware.ts` and exported function as `middleware` — SSR auth guard now active
- [x] Deleted empty `next.config.ts` — `next.config.js` is the sole config file
- [x] `npm run build` passes cleanly

---

## Phase 1 — Supabase: Run database migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **mkfrxfpuopqhxifuskhk**
2. Go to **SQL Editor**
3. Paste the full contents of `supabase/migrations/001_initial.sql` and run it

This creates:
- Tables: `rooms`, `trips`, `location_points`, `trip_summaries`, `purge_logs`
- All indexes
- Row Level Security policies on every table
- Realtime enabled on `location_points` and `trips`

**Verify after running:**
- [ ] Table Editor shows all 5 tables
- [ ] Authentication → Providers → Email is enabled (default on new projects)
- [ ] Realtime inspector shows `location_points` and `trips`

---

## Phase 2 — Supabase: Deploy Edge Functions

Install Supabase CLI (if not installed):

```bash
npm install -g supabase
```

Login and link to the project:

```bash
supabase login
supabase link --project-ref mkfrxfpuopqhxifuskhk
```

Deploy all three purge functions:

```bash
supabase functions deploy purge-downsample
supabase functions deploy purge-summarize
supabase functions deploy purge-archive
```

**Verify:** In the Supabase dashboard → **Edge Functions**, confirm all three appear with status Active.

---

## Phase 3 — Vercel: Deploy the Next.js app

### 3a. Push code to GitHub

```bash
git add middleware.ts next.config.js
git rm next.config.ts proxy.ts
git commit -m "fix: activate middleware auth guard, remove duplicate next.config"
git push origin main
```

### 3b. Create Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the GitHub repository
3. Framework preset auto-detects **Next.js** — leave all build settings as-is

### 3c. Set environment variables

In the Vercel project settings → **Environment Variables**, add these for **Production**, **Preview**, and **Development**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mkfrxfpuopqhxifuskhk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon JWT from `.env.local`)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(service role JWT from `.env.local`)* |

> `NEXT_PUBLIC_*` keys are exposed to the browser. `SUPABASE_SERVICE_ROLE_KEY` is server-only — never prefix it with `NEXT_PUBLIC_`.

### 3d. Deploy

Click **Deploy**. Vercel will run `npm run build` and serve the result.

**Note the production URL** (e.g. `https://travel-tracker.vercel.app`) — needed for the next step.

---

## Phase 4 — Supabase: Configure auth redirect URLs

Without this step, email confirmation links and OAuth redirects will fail in production.

1. Supabase dashboard → **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel production URL:
   ```
   https://travel-tracker.vercel.app
   ```
3. Under **Redirect URLs**, add:
   ```
   https://travel-tracker.vercel.app/**
   ```
4. Save

---

## Phase 5 — Supabase: Activate cron jobs

Replace `<SERVICE_ROLE_KEY>` with the value from `.env.local`, then run in the **SQL Editor**:

```sql
SELECT cron.schedule(
  'purge-downsample-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mkfrxfpuopqhxifuskhk.supabase.co/functions/v1/purge-downsample',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'purge-summarize-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mkfrxfpuopqhxifuskhk.supabase.co/functions/v1/purge-summarize',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'purge-archive-weekly',
  '0 4 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://mkfrxfpuopqhxifuskhk.supabase.co/functions/v1/purge-archive',
    headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

**Verify:** `SELECT * FROM cron.job;` should return 3 rows.

---

## Phase 6 — Post-deploy smoke test

- [ ] Register a new account at `https://travel-tracker.vercel.app/auth/register`
- [ ] Confirm email (check inbox) — redirect should land on `/dashboard`
- [ ] Create a room — verify it appears in the list
- [ ] Open room in a second browser tab — both tabs should see the same room code
- [ ] Start a trip on one tab — the other tab's map should update in real time
- [ ] End the trip — confirm it appears in `/history`
- [ ] Go to `/settings` → run manual purge → confirm response is `ok: true`
- [ ] Unauthenticated access to `/dashboard` should redirect to `/auth/login`

---

## Environment variable reference

| Variable | Used by | Exposed to browser |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/purge` route only | No |

---

## Architecture reminder

```
Browser → Vercel (Next.js) → Supabase (Postgres + Auth + Realtime)
                                    ↑
                          Edge Functions (purge pipeline)
                                    ↑
                          pg_cron (scheduled triggers)
```

Realtime GPS updates flow: `location_points INSERT` → Supabase Realtime → `useRealtimeTracking` hook → Leaflet map update.
