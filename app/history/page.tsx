"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { History, MapPin, Clock, Navigation, ChevronDown, ChevronUp, Archive, Loader2, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Trip, Room, LocationPoint, TripSummary } from "@/types";
import { formatDuration, formatDistance } from "@/utils";

const TrackingMap = dynamic(
  () => import("@/components/map/TrackingMap").then((m) => m.TrackingMap),
  { ssr: false }
);

interface TripWithRoom extends Trip {
  room: Room;
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Full", color: "var(--accent)" },
  2: { label: "Downsampled", color: "var(--warn)" },
  3: { label: "Summary", color: "var(--text-muted)" },
  4: { label: "Archived", color: "var(--text-muted)" },
};

export default function HistoryPage() {
  const supabase = createClient();
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPoints, setExpandedPoints] = useState<LocationPoint[]>([]);
  const [expandedSummary, setExpandedSummary] = useState<TripSummary | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [filter, setFilter] = useState<"all" | "full" | "summary" | "archived">("all");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data } = await supabase
      .from("trips")
      .select("*, room:rooms(*)")
      .eq("user_id", user.id)
      .eq("status", "ended")
      .order("started_at", { ascending: false })
      .limit(50);

    setTrips((data as TripWithRoom[]) ?? []);
    setLoading(false);
  }, [supabase, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function toggleExpand(trip: TripWithRoom) {
    if (expandedId === trip.id) { setExpandedId(null); return; }
    setExpandedId(trip.id);
    setLoadingPoints(true);

    if (trip.retention_tier <= 2) {
      const { data } = await supabase
        .from("location_points")
        .select("*")
        .eq("trip_id", trip.id)
        .order("recorded_at", { ascending: true });
      setExpandedPoints(data ?? []);
      setExpandedSummary(null);
    } else {
      const { data } = await supabase
        .from("trip_summaries")
        .select("*")
        .eq("trip_id", trip.id)
        .maybeSingle();
      setExpandedSummary(data);
      if (data?.waypoints) {
        setExpandedPoints(
          data.waypoints.map((w: { lat: number; lng: number }, i: number) => ({
            id: `wp-${i}`,
            trip_id: trip.id,
            lat: w.lat,
            lng: w.lng,
            accuracy: null,
            recorded_at: trip.started_at,
          }))
        );
      }
    }
    setLoadingPoints(false);
  }

  const filtered = trips.filter((t) => {
    if (filter === "all") return true;
    if (filter === "full") return t.retention_tier <= 2;
    if (filter === "summary") return t.retention_tier === 3;
    if (filter === "archived") return t.retention_tier === 4;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} /></div>;
  }

  return (
    <div className="p-4 md:p-10 max-w-4xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">Trip History</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{trips.length} trips recorded</p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter size={14} style={{ color: "var(--text-muted)" }} />
        {(["all", "full", "summary", "archived"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize"
            style={{
              background: filter === f ? "var(--accent-dim)" : "var(--surface)",
              color: filter === f ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${filter === f ? "var(--accent-glow)" : "var(--border)"}`,
            }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center rounded-2xl" style={{ border: "1px dashed var(--border)" }}>
          <History size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No trips found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((trip) => {
            const tierInfo = TIER_LABELS[trip.retention_tier] ?? TIER_LABELS[1];
            const isExpanded = expandedId === trip.id;

            return (
              <div key={trip.id} className="rounded-2xl overflow-hidden transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* Trip row */}
                <div className="p-5 flex items-center gap-4 cursor-pointer hover:bg-[var(--surface-2)] transition-all"
                  onClick={() => toggleExpand(trip)}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--surface-2)" }}>
                    {trip.retention_tier === 4
                      ? <Archive size={16} style={{ color: "var(--text-muted)" }} />
                      : <MapPin size={16} style={{ color: "var(--accent)" }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm truncate">{trip.room?.name ?? "Unknown room"}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full mono font-bold flex-shrink-0"
                        style={{ background: "var(--surface-2)", color: tierInfo.color }}>
                        {tierInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs mono" style={{ color: "var(--text-muted)" }}>
                      <span className="flex items-center gap-1"><Clock size={11} /> {formatDuration(trip.started_at, trip.ended_at)}</span>
                      <span className="flex items-center gap-1 hidden sm:flex"><Navigation size={11} /> {formatDistance(trip.distance_km)}</span>
                      <span className="flex items-center gap-1 hidden sm:flex"><MapPin size={11} /> {trip.total_points} pts</span>
                    </div>
                  </div>

                  <div className="text-xs mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    {new Date(trip.started_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}
                  </div>

                  {isExpanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                </div>

                {/* Expanded map */}
                {isExpanded && (
                  <div className="px-5 pb-5 animate-fade-in">
                    <div style={{ height: 300 }}>
                      {loadingPoints
                        ? <div className="h-full rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}><Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
                        : expandedPoints.length > 0
                          ? <TrackingMap points={expandedPoints} isLive={false} className="h-full" />
                          : <div className="h-full rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No route data available</p>
                            </div>
                      }
                    </div>
                    {expandedSummary && (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs mono">
                        <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                          <div style={{ color: "var(--text-muted)" }}>Duration</div>
                          <div className="font-bold mt-0.5">{expandedSummary.duration_minutes} min</div>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                          <div style={{ color: "var(--text-muted)" }}>Distance</div>
                          <div className="font-bold mt-0.5">{formatDistance(expandedSummary.distance_km)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
