import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Verify caller is an admin
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalRooms },
    { count: activeTrips },
    { count: totalTrips },
    { count: totalPoints },
    { data: recentPurgeLogs },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("rooms").select("*", { count: "exact", head: true }),
    admin.from("trips").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("trips").select("*", { count: "exact", head: true }),
    admin.from("location_points").select("*", { count: "exact", head: true }),
    admin.from("purge_logs").select("*").order("executed_at", { ascending: false }).limit(5),
  ]);

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalRooms: totalRooms ?? 0,
    activeTrips: activeTrips ?? 0,
    totalTrips: totalTrips ?? 0,
    totalPoints: totalPoints ?? 0,
    recentPurgeLogs: recentPurgeLogs ?? [],
  });
}
