-- ============================================================
-- TrackR — Supabase Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  code                TEXT NOT NULL UNIQUE,
  is_active           BOOLEAN DEFAULT false,
  retention_days      INT DEFAULT 90,
  auto_purge_enabled  BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  distance_km     FLOAT DEFAULT 0,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  retention_tier  INT DEFAULT 1 CHECK (retention_tier BETWEEN 1 AND 4),
  total_points    INT DEFAULT 0,
  archived_at     TIMESTAMPTZ,
  auto_delete_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS location_points (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  lat          FLOAT NOT NULL,
  lng          FLOAT NOT NULL,
  accuracy     FLOAT,
  recorded_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  start_lat        FLOAT,
  start_lng        FLOAT,
  end_lat          FLOAT,
  end_lng          FLOAT,
  bounding_box     JSONB,
  waypoints        JSONB,
  distance_km      FLOAT,
  duration_minutes INT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purge_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by     TEXT CHECK (triggered_by IN ('scheduled', 'manual', 'user_request')),
  tier_affected    INT,
  trips_affected   INT DEFAULT 0,
  points_deleted   INT DEFAULT 0,
  storage_freed_kb FLOAT DEFAULT 0,
  executed_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_trips_user_id       ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_room_id       ON trips(room_id);
CREATE INDEX IF NOT EXISTS idx_trips_status        ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_ended_at      ON trips(ended_at);
CREATE INDEX IF NOT EXISTS idx_trips_tier          ON trips(retention_tier);
CREATE INDEX IF NOT EXISTS idx_location_trip       ON location_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_recorded   ON location_points(recorded_at);
CREATE INDEX IF NOT EXISTS idx_rooms_owner         ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code          ON rooms(code);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE purge_logs ENABLE ROW LEVEL SECURITY;

-- Rooms: owner can CRUD, anyone can SELECT (to join by code)
CREATE POLICY "rooms_select_all" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_owner" ON rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "rooms_update_owner" ON rooms FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "rooms_delete_owner" ON rooms FOR DELETE USING (auth.uid() = owner_id);

-- Trips: owner can CRUD, room viewers can SELECT
CREATE POLICY "trips_select" ON trips FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM rooms WHERE rooms.id = trips.room_id)
);
CREATE POLICY "trips_insert_owner" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update_owner" ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trips_delete_owner" ON trips FOR DELETE USING (auth.uid() = user_id);

-- Location points: insert by tracker, select by anyone in room
CREATE POLICY "points_select" ON location_points FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = location_points.trip_id)
);
CREATE POLICY "points_insert" ON location_points FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = location_points.trip_id AND trips.user_id = auth.uid())
);
CREATE POLICY "points_delete_owner" ON location_points FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = location_points.trip_id AND trips.user_id = auth.uid())
);

-- Trip summaries: same as trips
CREATE POLICY "summaries_select" ON trip_summaries FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_summaries.trip_id AND trips.user_id = auth.uid())
);

-- Purge logs: user sees their own (via service role writes)
CREATE POLICY "purge_logs_select" ON purge_logs FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE location_points;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;

-- ─────────────────────────────────────────
-- CRON JOBS (pg_cron)
-- ─────────────────────────────────────────

-- Replace <YOUR_PROJECT_REF> and <YOUR_SERVICE_ROLE_KEY> before running

-- SELECT cron.schedule(
--   'purge-downsample-daily',
--   '0 2 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/purge-downsample',
--     headers := jsonb_build_object('Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- SELECT cron.schedule(
--   'purge-summarize-daily',
--   '0 3 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/purge-summarize',
--     headers := jsonb_build_object('Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- SELECT cron.schedule(
--   'purge-archive-weekly',
--   '0 4 * * 0',
--   $$
--   SELECT net.http_post(
--     url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/purge-archive',
--     headers := jsonb_build_object('Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>', 'Content-Type', 'application/json'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
