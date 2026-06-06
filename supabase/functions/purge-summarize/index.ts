// supabase/functions/purge-summarize/index.ts
// Runs daily at 03:00 — summarize trips aged 30-90 days (tier 2 → 3)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();
  const ninetyDaysAgo = new Date(now - 90 * 86_400_000).toISOString();

  const { data: trips } = await supabase
    .from("trips")
    .select("id, distance_km, started_at, ended_at")
    .eq("status", "ended")
    .in("retention_tier", [1, 2])
    .lt("ended_at", thirtyDaysAgo)
    .gt("ended_at", ninetyDaysAgo);

  let summarized = 0;

  for (const trip of trips ?? []) {
    const { data: points } = await supabase
      .from("location_points")
      .select("lat, lng, recorded_at")
      .eq("trip_id", trip.id)
      .order("recorded_at", { ascending: true });

    if (!points?.length) continue;

    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);

    const bounding_box = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };

    // ~10 representative waypoints
    const step = Math.max(1, Math.floor(points.length / 10));
    const waypoints = points
      .filter((_, i) => i % step === 0 || i === points.length - 1)
      .map((p) => ({ lat: p.lat, lng: p.lng }))
      .slice(0, 12);

    const durationMs =
      trip.ended_at
        ? new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()
        : 0;

    await supabase.from("trip_summaries").upsert({
      trip_id: trip.id,
      start_lat: points[0].lat,
      start_lng: points[0].lng,
      end_lat: points[points.length - 1].lat,
      end_lng: points[points.length - 1].lng,
      bounding_box,
      waypoints,
      distance_km: trip.distance_km,
      duration_minutes: Math.round(durationMs / 60_000),
    });

    // Remove all raw points
    await supabase.from("location_points").delete().eq("trip_id", trip.id);

    await supabase
      .from("trips")
      .update({ retention_tier: 3, total_points: 0 })
      .eq("id", trip.id);

    summarized++;
  }

  await supabase.from("purge_logs").insert({
    triggered_by: "scheduled",
    tier_affected: 2,
    trips_affected: summarized,
    points_deleted: 0, // points already deleted above
    storage_freed_kb: summarized * 36, // ~36 KB avg saved per trip
  });

  return new Response(
    JSON.stringify({ success: true, summarized }),
    { headers: { "Content-Type": "application/json" } }
  );
});
