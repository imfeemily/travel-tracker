"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { MapPin, Clock, Navigation, ChevronDown, ChevronUp, Archive, Loader2 } from "lucide-react";
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
  1: { label: "Full", color: "var(--go)" },
  2: { label: "Downsampled", color: "var(--warn)" },
  3: { label: "Summary", color: "var(--text-muted)" },
  4: { label: "Archived", color: "var(--text-muted)" },
};

const FILTERS = ["All", "Full", "Summary", "Archived"] as const;
type Filter = "all" | "full" | "summary" | "archived";

export default function HistoryPage() {
  const supabase = createClient();
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPoints, setExpandedPoints] = useState<LocationPoint[]>([]);
  const [expandedSummary, setExpandedSummary] = useState<TripSummary | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight mb-0.5">History</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{trips.length} trips recorded</p>
      </div>

      {/* Filter tabs */}
      <div
        className="flex mb-6 p-1"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
      >
        {FILTERS.map((f) => {
          const key = f.toLowerCase() as Filter;
          const active = filter === key;
          return (
            <button
              key={f}
              onClick={() => setFilter(key)}
              className="flex-1 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: active ? "var(--text)" : "transparent",
                color: active ? "var(--bg)" : "var(--text-muted)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div
          className="py-20 text-center"
          style={{ border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}
        >
          <MapPin size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No trips found</p>
        </div>
      ) : (
        <div
          className="uber-list overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
        >
          {filtered.map((trip) => {
            const tierInfo = TIER_LABELS[trip.retention_tier] ?? TIER_LABELS[1];
            const isExpanded = expandedId === trip.id;

            return (
              <div key={trip.id}>
                {/* Trip row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                  onClick={() => toggleExpand(trip)}
                >
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center"
                    style={{ background: "var(--surface-2)" }}
                  >
                    {trip.retention_tier === 4
                      ? <Archive size={14} style={{ color: "var(--text-muted)" }} />
                      : <MapPin size={14} style={{ color: "var(--text-muted)" }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm truncate">{trip.room?.name ?? "Unknown room"}</span>
                      <span
                        className="text-[10px] font-black uppercase tracking-wider flex-shrink-0"
                        style={{ color: tierInfo.color }}
                      >
                        {tierInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {formatDuration(trip.started_at, trip.ended_at)}
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Navigation size={10} /> {formatDistance(trip.distance_km)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs mono font-medium" style={{ color: "var(--text-muted)" }}>
                      {new Date(trip.started_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                    {isExpanded
                      ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
                      : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                    }
                  </div>
                </div>

                {/* Expanded map */}
                {isExpanded && (
                  <div className="px-5 pb-5 animate-fade-in" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="mt-4" style={{ height: 280 }}>
                      {loadingPoints
                        ? (
                          <div
                            className="h-full flex items-center justify-center"
                            style={{ background: "var(--surface-2)", borderRadius: "var(--radius)" }}
                          >
                            <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                          </div>
                        )
                        : expandedPoints.length > 0
                          ? <TrackingMap points={expandedPoints} isLive={false} className="h-full" />
                          : (
                            <div
                              className="h-full flex items-center justify-center"
                              style={{ background: "var(--surface-2)", borderRadius: "var(--radius)" }}
                            >
                              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No route data</p>
                            </div>
                          )
                      }
                    </div>

                    {expandedSummary && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          { label: "Duration", value: `${expandedSummary.duration_minutes} min` },
                          { label: "Distance", value: formatDistance(expandedSummary.distance_km) },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="p-3"
                            style={{ background: "var(--surface-2)", borderRadius: "var(--radius)" }}
                          >
                            <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                            <div className="text-base font-black mono">{value}</div>
                          </div>
                        ))}
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
