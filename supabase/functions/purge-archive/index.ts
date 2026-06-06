// supabase/functions/purge-archive/index.ts
// Runs weekly on Sunday at 04:00 — archive or delete trips aged 90+ days

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = Date.now();

  // Fetch trips older than their room's retention_days that haven't been archived
  const { data: trips } = await supabase
    .from("trips")
    .select("id, room_id, ended_at, user_id")
    .eq("status", "ended")
    .not("retention_tier", "eq", 4);

  let archived = 0;
  let deleted = 0;

  for (const trip of trips ?? []) {
    const { data: room } = await supabase
      .from("rooms")
      .select("auto_purge_enabled, retention_days")
      .eq("id", trip.room_id)
      .single();

    if (!room || !trip.ended_at) continue;

    const retentionMs = (room.retention_days ?? 90) * 86_400_000;
    const tripAge = now - new Date(trip.ended_at).getTime();

    if (tripAge < retentionMs) continue; // Not old enough yet

    if (room.auto_purge_enabled) {
      // Hard delete
      await supabase.from("trip_summaries").delete().eq("trip_id", trip.id);
      await supabase.from("location_points").delete().eq("trip_id", trip.id);
      await supabase.from("trips").delete().eq("id", trip.id);
      deleted++;
    } else {
      // Soft archive
      await supabase
        .from("trips")
        .update({
          retention_tier: 4,
          archived_at: new Date().toISOString(),
        })
        .eq("id", trip.id);
      archived++;
    }
  }

  await supabase.from("purge_logs").insert({
    triggered_by: "scheduled",
    tier_affected: 3,
    trips_affected: archived + deleted,
    points_deleted: 0,
    storage_freed_kb: deleted * 2, // summary ~2 KB
  });

  return new Response(
    JSON.stringify({ success: true, archived, deleted }),
    { headers: { "Content-Type": "application/json" } }
  );
});
