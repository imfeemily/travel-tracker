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
  2: { label: "Sampled", color: "var(--warn)" },
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
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-28 md:pb-8">

      {/* Header */}
      <div className="px-5 pt-8 pb-6 md:px-8 md:pt-10 animate-slide-down">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
          {trips.length} trips recorded
        </p>
        <h1 className="text-3xl font-black tracking-tight">History</h1>
      </div>

      {/* Filter pills */}
      <div className="px-5 md:px-8 mb-6 animate-slide-up" style={{ animationDelay: "80ms" }}>
        <div
          className="flex p-1 gap-1 rounded-xl"
          style={{ background: "var(--surface)" }}
        >
          {FILTERS.map((f) => {
            const key = f.toLowerCase() as Filter;
            const active = filter === key;
            return (
              <button
                key={f}
                onClick={() => setFilter(key)}
                className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
                style={{
                  background: active ? "var(--surface-3)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="px-5 md:px-8 animate-slide-up" style={{ animationDelay: "160ms" }}>
        {filtered.length === 0 ? (
          <div
            className="py-16 text-center rounded-2xl animate-fade-in"
            style={{ border: "1px dashed var(--border)", background: "var(--surface)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float"
              style={{ background: "var(--go-dim)" }}
            >
              <Navigation size={22} style={{ color: "var(--go)" }} />
            </div>
            <p className="text-sm font-semibold mb-1">No trips found</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Completed trips will appear here
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
          >
            {filtered.map((trip, i) => {
              const tierInfo = TIER_LABELS[trip.retention_tier] ?? TIER_LABELS[1];
              const isExpanded = expandedId === trip.id;
              const isLast = i === filtered.length - 1;

              return (
                <div
                  key={trip.id}
                  style={{ borderBottom: isLast && !isExpanded ? "none" : "1px solid var(--border-subtle)" }}
                >
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] animate-slide-left"
                    style={{ minHeight: 72, animationDelay: `${i * 40}ms` }}
                    onClick={() => toggleExpand(trip)}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--surface-2)" }}
                    >
                      {trip.retention_tier === 4
                        ? <Archive size={15} style={{ color: "var(--text-muted)" }} />
                        : <Navigation size={15} style={{ color: "var(--text-muted)" }} />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm truncate">{trip.room?.name ?? "Unknown room"}</span>
                        <span
                          className="text-[10px] font-black uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 rounded-md"
                          style={{
                            background: trip.retention_tier === 1 ? "var(--go-dim)" : "var(--surface-2)",
                            color: tierInfo.color,
                          }}
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

                    <div className="flex items-center gap-2 flex-shrink-0">
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
                    <div className="px-5 pb-5 animate-fade-in" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <div className="mt-4 rounded-xl overflow-hidden" style={{ height: 260 }}>
                        {loadingPoints
                          ? (
                            <div
                              className="h-full flex items-center justify-center"
                              style={{ background: "var(--surface-2)" }}
                            >
                              <Loader2 size={18} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                            </div>
                          )
                          : expandedPoints.length > 0
                            ? <TrackingMap points={expandedPoints} isLive={false} className="h-full" />
                            : (
                              <div
                                className="h-full flex flex-col items-center justify-center gap-2"
                                style={{ background: "var(--surface-2)" }}
                              >
                                <MapPin size={20} style={{ color: "var(--text-muted)" }} />
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
                              className="p-3.5 rounded-xl"
                              style={{ background: "var(--surface-2)" }}
                            >
                              <div className="text-xs mb-1.5 font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
                              <div className="text-lg font-black mono">{value}</div>
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
    </div>
  );
}
