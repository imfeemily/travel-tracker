"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Radio, Square, Play, Copy, Check, Users,
  Navigation, Clock, Loader2, MapPin, Wifi, WifiOff,
  ChevronUp, ChevronDown, LocateFixed, AlertTriangle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useRealtimeTracking } from "@/lib/hooks/useRealtimeTracking";
import { Room, Trip, LocationPoint } from "@/types";
import { formatDuration, formatDistance, calculateDistance } from "@/utils";

const TrackingMap = dynamic(
  () => import("@/components/map/TrackingMap").then((m) => m.TrackingMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--surface)" }}>
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );
}

type PermState = "unknown" | "granted" | "denied" | "requesting";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [room, setRoom] = useState<Room | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingTrip, setStartingTrip] = useState(false);
  const [stoppingTrip, setStoppingTrip] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const [totalDist, setTotalDist] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [permState, setPermState] = useState<PermState>("unknown");
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

  const isOwner = room?.owner_id === userId;

  // ── Location permission + initial position ───────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setPermState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
        setPermState("granted");
      },
      (err) => {
        setPermState(err.code === err.PERMISSION_DENIED ? "denied" : "granted");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { requestLocation(); }, [requestLocation]);

  // ── Trip point saving ─────────────────────────────────────────────────────
  const savePoint = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      if (!activeTrip) return;
      setCurrentLocation([lat, lng]);
      await supabase.from("location_points").insert({
        trip_id: activeTrip.id,
        lat, lng, accuracy,
        recorded_at: new Date().toISOString(),
      });
    },
    [activeTrip, supabase]
  );

  const geo = useGeolocation({ intervalMs: 5000, onPosition: savePoint });

  useRealtimeTracking({
    tripId: activeTrip?.id ?? null,
    onNewPoint: (point) => {
      setPoints((prev) => {
        const updated = [...prev, point];
        if (updated.length > 1) {
          const last = updated[updated.length - 2];
          setTotalDist((d) => d + calculateDistance(last.lat, last.lng, point.lat, point.lng));
        }
        return updated;
      });
    },
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setUserId(user.id);

    const { data: roomData } = await supabase.from("rooms").select("*").eq("code", code).single();
    if (!roomData) { router.push("/dashboard"); return; }
    setRoom(roomData);

    const { data: tripData } = await supabase
      .from("trips").select("*").eq("room_id", roomData.id).eq("status", "active").maybeSingle();

    if (tripData) {
      setActiveTrip(tripData);
      const { data: pts } = await supabase
        .from("location_points").select("*").eq("trip_id", tripData.id).order("recorded_at", { ascending: true });
      const loaded = pts ?? [];
      setPoints(loaded);
      if (loaded.length > 1) {
        let dist = 0;
        for (let i = 1; i < loaded.length; i++) {
          dist += calculateDistance(loaded[i - 1].lat, loaded[i - 1].lng, loaded[i].lat, loaded[i].lng);
        }
        setTotalDist(dist);
      }
    }
    setLoading(false);
  }, [code, supabase, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeTrip) return;
    const t = setInterval(() => setElapsed(formatDuration(activeTrip.started_at)), 1000);
    return () => clearInterval(t);
  }, [activeTrip]);

  // Start/stop geo tracking in sync with activeTrip state
  useEffect(() => {
    if (activeTrip) {
      geo.start();
    } else {
      geo.stop();
    }
    // geo.start/stop are stable — intentionally omitting geo from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip]);

  async function startTrip() {
    if (!room || !userId) return;
    if (permState !== "granted") { requestLocation(); return; }
    setStartingTrip(true);
    const { data: trip } = await supabase
      .from("trips").insert({ room_id: room.id, user_id: userId, status: "active" }).select().single();
    if (trip) {
      await supabase.from("rooms").update({ is_active: true }).eq("id", room.id);
      setActiveTrip(trip);
      setPoints([]);
      setTotalDist(0);
      // geo.start() is triggered by the useEffect above once activeTrip state commits
    }
    setStartingTrip(false);
  }

  async function stopTrip() {
    if (!activeTrip || !room) return;
    setStoppingTrip(true);
    // geo.stop() is triggered by the useEffect above once activeTrip clears
    await supabase.from("trips").update({
      status: "ended",
      ended_at: new Date().toISOString(),
      distance_km: totalDist,
      total_points: points.length,
    }).eq("id", activeTrip.id);
    await supabase.from("rooms").update({ is_active: false }).eq("id", room.id);
    setActiveTrip(null); // triggers geo.stop() via useEffect
    setPoints([]);
    setTotalDist(0);
    setStoppingTrip(false);
  }

  async function copyCode() {
    if (!room) return;
    await navigator.clipboard.writeText(room.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (!room) return null;

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: "100dvh", background: "var(--bg)" }}
    >
      {/* ── Full-screen map ── */}
      <div className="absolute inset-0">
        <TrackingMap
          points={points}
          isLive={!!activeTrip}
          currentLocation={currentLocation}
          className="h-full w-full rounded-none"
        />
      </div>

      {/* ── Permission denied banner ── */}
      {permState === "denied" && (
        <div
          className="absolute top-4 left-4 right-4 z-20 flex items-start gap-3 px-4 py-3 animate-slide-up"
          style={{ background: "rgba(225,25,0,0.12)", border: "1px solid rgba(225,25,0,0.3)", borderRadius: "var(--radius-lg)" }}
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--danger)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Location access denied</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Enable location in your browser settings to track a trip
            </p>
          </div>
          <button onClick={requestLocation} className="text-xs font-bold flex-shrink-0" style={{ color: "var(--danger)" }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Top bar ── */}
      <div
        className="absolute left-4 right-4 z-10"
        style={{ top: permState === "denied" ? "5.5rem" : "1rem" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {activeTrip
              ? <Radio size={14} className="animate-pulse-accent flex-shrink-0" style={{ color: "var(--go)" }} />
              : <MapPin size={14} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            }
            <span className="font-bold text-sm truncate">{room.name}</span>
            {activeTrip && (
              <span
                className="text-[10px] font-black uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 rounded"
                style={{ background: "var(--go-dim)", color: "var(--go)" }}
              >
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* GPS status */}
            <div
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium"
              style={{
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
                color: activeTrip ? "var(--go)" : "var(--text-muted)",
              }}
            >
              {activeTrip ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span className="hidden sm:inline">{activeTrip ? "Live" : "Off"}</span>
            </div>

            {/* Location button */}
            {permState === "granted" && (
              <button
                onClick={() => currentLocation && null}
                className="flex items-center justify-center w-8 h-8 transition-colors active:bg-[var(--surface-3)]"
                style={{ background: "var(--surface-2)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)" }}
                title="My location"
              >
                <LocateFixed size={13} />
              </button>
            )}

            {/* Room code */}
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold mono transition-colors active:opacity-70"
              style={{
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
                color: codeCopied ? "var(--go)" : "var(--text-dim)",
              }}
            >
              {codeCopied ? <Check size={11} /> : <Copy size={11} />}
              {room.code}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <div
        className="absolute left-4 right-4 z-10 safe-bottom"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Drag handle + toggle (mobile) */}
          <button
            className="w-full flex flex-col items-center pt-3 pb-2 md:hidden active:opacity-70"
            onClick={() => setPanelOpen((o) => !o)}
            aria-label="Toggle panel"
          >
            <div className="w-10 h-1 rounded-full mb-2" style={{ background: "var(--border)" }} />
            <div className="w-full flex items-center justify-between px-5 pb-1">
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {activeTrip ? "Tracking" : "Ready"}
              </span>
              {panelOpen
                ? <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                : <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
              }
            </div>
          </button>

          {/* Panel content */}
          <div className={`px-4 pb-4 ${panelOpen ? "block" : "hidden"} md:block md:px-5 md:pb-5`}>
            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2 mb-4 pt-2 md:pt-4">
              <StatBox icon={Clock} label="Time" value={activeTrip ? elapsed || "0:00" : "—"} live={!!activeTrip} />
              <StatBox icon={Navigation} label="Dist" value={totalDist > 0 ? formatDistance(totalDist) : "—"} />
              <StatBox icon={MapPin} label="Pts" value={points.length.toString()} />
              <StatBox icon={Users} label="GPS" value={geo.accuracy ? `±${Math.round(geo.accuracy)}m` : "—"} live={!!geo.isTracking} />
            </div>

            {/* CTA row */}
            <div className="flex gap-2">
              {isOwner && (
                <>
                  {!activeTrip ? (
                    <button
                      onClick={startTrip}
                      disabled={startingTrip || permState === "requesting"}
                      className="flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-40"
                      style={{ background: "var(--go)", color: "white", borderRadius: "var(--radius)" }}
                    >
                      {startingTrip || permState === "requesting"
                        ? <Loader2 size={15} className="animate-spin" />
                        : permState === "denied"
                          ? <><AlertTriangle size={15} /> Location needed</>
                          : <><Play size={15} fill="currentColor" /> Start trip</>
                      }
                    </button>
                  ) : (
                    <button
                      onClick={stopTrip}
                      disabled={stoppingTrip}
                      className="flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-40"
                      style={{ background: "var(--danger)", color: "white", borderRadius: "var(--radius)" }}
                    >
                      {stoppingTrip
                        ? <Loader2 size={15} className="animate-spin" />
                        : <><Square size={15} fill="currentColor" /> End trip</>
                      }
                    </button>
                  )}
                </>
              )}

              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-4 py-4 font-bold text-sm transition-opacity active:opacity-70"
                style={{
                  background: "var(--surface-2)",
                  color: codeCopied ? "var(--go)" : "var(--text)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                }}
              >
                {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                <span className="mono font-black tracking-widest text-xs">{room.code}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, live = false }: {
  icon: React.ElementType;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center text-center p-2.5 min-h-[64px] justify-center"
      style={{ background: "var(--surface-2)", borderRadius: "var(--radius)" }}
    >
      <Icon size={12} className="mb-1.5" style={{ color: live ? "var(--go)" : "var(--text-muted)" }} />
      <div className="text-sm font-black mono leading-none" style={{ color: live ? "var(--go)" : "var(--text)" }}>{value}</div>
      <div className="text-[9px] font-semibold uppercase tracking-wide mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
