// supabase/functions/purge-downsample/index.ts
// Runs daily at 02:00 — downsample trips aged 7-30 days (tier 1 → 2)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * 86_400_000).toISOString();

  const { data: trips, error } = await supabase
    .from("trips")
    .select("id")
    .eq("status", "ended")
    .eq("retention_tier", 1)
    .lt("ended_at", sevenDaysAgo)
    .gt("ended_at", thirtyDaysAgo);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let totalDeleted = 0;

  for (const trip of trips ?? []) {
    const { data: points } = await supabase
      .from("location_points")
      .select("id")
      .eq("trip_id", trip.id)
      .order("recorded_at", { ascending: true });

    if (!points || points.length < 10) continue;

    // Keep every 5th point, delete the rest
    const toDelete = points.filter((_, i) => i % 5 !== 0).map((p) => p.id);

    if (toDelete.length > 0) {
      await supabase.from("location_points").delete().in("id", toDelete);
    }

    await supabase
      .from("trips")
      .update({ retention_tier: 2, total_points: points.length - toDelete.length })
      .eq("id", trip.id);

    totalDeleted += toDelete.length;
  }

  await supabase.from("purge_logs").insert({
    triggered_by: "scheduled",
    tier_affected: 1,
    trips_affected: trips?.length ?? 0,
    points_deleted: totalDeleted,
    storage_freed_kb: (totalDeleted * 250) / 1024,
  });

  return new Response(
    JSON.stringify({ success: true, trips: trips?.length, deleted: totalDeleted }),
    { headers: { "Content-Type": "application/json" } }
  );
});
