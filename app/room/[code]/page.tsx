"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Radio, Square, Play, Copy, Check, Users,
  Navigation, Clock, Loader2, MapPin, Wifi, WifiOff, ChevronDown, ChevronUp
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
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );
}

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
  const [panelOpen, setPanelOpen] = useState(false);

  const isOwner = room?.owner_id === userId;

  const savePoint = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      if (!activeTrip) return;
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

  async function startTrip() {
    if (!room || !userId) return;
    setStartingTrip(true);
    const { data: trip } = await supabase
      .from("trips").insert({ room_id: room.id, user_id: userId, status: "active" }).select().single();
    if (trip) {
      await supabase.from("rooms").update({ is_active: true }).eq("id", room.id);
      setActiveTrip(trip);
      setPoints([]);
      setTotalDist(0);
      geo.start();
    }
    setStartingTrip(false);
  }

  async function stopTrip() {
    if (!activeTrip || !room) return;
    setStoppingTrip(true);
    geo.stop();
    await supabase.from("trips").update({
      status: "ended",
      ended_at: new Date().toISOString(),
      distance_km: totalDist,
      total_points: points.length,
    }).eq("id", activeTrip.id);
    await supabase.from("rooms").update({ is_active: false }).eq("id", room.id);
    setActiveTrip(null);
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
    <div className="relative h-[calc(100vh-64px)] md:h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <TrackingMap points={points} isLive={!!activeTrip} className="h-full w-full" />
      </div>

      {/* ── Top overlay bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
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

          <div className="flex items-center gap-2">
            {/* GPS */}
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium"
              style={{
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
                color: activeTrip ? "var(--go)" : "var(--text-muted)",
              }}
            >
              {activeTrip ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span className="hidden sm:inline">{activeTrip ? "On" : "Off"}</span>
            </div>
            {/* Room code */}
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold mono transition-opacity hover:opacity-80"
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

      {/* ── Bottom overlay panel ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4">
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Panel toggle (mobile) */}
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 md:hidden"
            onClick={() => setPanelOpen(!panelOpen)}
          >
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Trip details
            </span>
            {panelOpen ? <ChevronDown size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />}
          </button>

          {/* Stats row — always visible on desktop, collapsible on mobile */}
          <div className={`px-5 pb-4 gap-4 ${panelOpen ? "block" : "hidden"} md:block`}>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4 pt-4 md:pt-0">
              <StatBox icon={Clock} label="Duration" value={activeTrip ? elapsed || "0:00" : "—"} live={!!activeTrip} />
              <StatBox icon={Navigation} label="Distance" value={totalDist > 0 ? formatDistance(totalDist) : "—"} />
              <StatBox icon={MapPin} label="Points" value={points.length.toString()} />
              <StatBox icon={Users} label="GPS" value={geo.accuracy ? `±${Math.round(geo.accuracy)}m` : "—"} live={!!geo.isTracking} />
            </div>

            {/* Controls */}
            <div className="flex gap-3 items-center">
              {isOwner && (
                <>
                  {!activeTrip ? (
                    <button
                      onClick={startTrip}
                      disabled={startingTrip}
                      className="flex-1 py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
                      style={{ background: "var(--go)", color: "white", borderRadius: "var(--radius)" }}
                    >
                      {startingTrip
                        ? <Loader2 size={15} className="animate-spin" />
                        : <><Play size={15} fill="currentColor" /> Start trip</>
                      }
                    </button>
                  ) : (
                    <button
                      onClick={stopTrip}
                      disabled={stoppingTrip}
                      className="flex-1 py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
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

              {/* Share code */}
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-4 py-3.5 text-sm font-bold transition-opacity hover:opacity-80"
                style={{
                  background: "var(--surface-2)",
                  color: codeCopied ? "var(--go)" : "var(--text)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  minWidth: 0,
                }}
              >
                {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                <span className="mono font-black tracking-widest">{room.code}</span>
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
    <div className="flex flex-col items-center text-center p-2.5" style={{ background: "var(--surface-2)", borderRadius: "var(--radius)" }}>
      <Icon size={11} className="mb-1" style={{ color: live ? "var(--go)" : "var(--text-muted)" }} />
      <div className="text-base font-black mono leading-none" style={{ color: live ? "var(--go)" : "var(--text)" }}>{value}</div>
      <div className="text-[9px] font-semibold uppercase tracking-wide mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
