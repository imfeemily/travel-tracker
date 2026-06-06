"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Radio, Square, Play, Copy, Check, Users,
  Navigation, Clock, Loader2, MapPin, Wifi, WifiOff
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useRealtimeTracking } from "@/lib/hooks/useRealtimeTracking";
import { Room, Trip, LocationPoint } from "@/types";
import { formatDuration, formatDistance, calculateDistance } from "@/utils";

// Dynamic import for Leaflet (no SSR)
const TrackingMap = dynamic(
  () => import("@/components/map/TrackingMap").then((m) => m.TrackingMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-full rounded-2xl flex items-center justify-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
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

  const isOwner = room?.owner_id === userId;

  // Save location point to DB
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

  // Realtime subscription — viewer updates
  useRealtimeTracking({
    tripId: activeTrip?.id ?? null,
    onNewPoint: (point) => {
      setPoints((prev) => {
        const updated = [...prev, point];
        // recalculate distance
        if (updated.length > 1) {
          const last = updated[updated.length - 2];
          setTotalDist((d) => d + calculateDistance(last.lat, last.lng, point.lat, point.lng));
        }
        return updated;
      });
    },
  });

  // Load room + active trip + existing points
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setUserId(user.id);

    const { data: roomData } = await supabase.from("rooms").select("*").eq("code", code).single();
    if (!roomData) { router.push("/dashboard"); return; }
    setRoom(roomData);

    const { data: tripData } = await supabase
      .from("trips")
      .select("*")
      .eq("room_id", roomData.id)
      .eq("status", "active")
      .maybeSingle();

    if (tripData) {
      setActiveTrip(tripData);
      const { data: pts } = await supabase
        .from("location_points")
        .select("*")
        .eq("trip_id", tripData.id)
        .order("recorded_at", { ascending: true });
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

  // Elapsed timer
  useEffect(() => {
    if (!activeTrip) return;
    const t = setInterval(() => setElapsed(formatDuration(activeTrip.started_at)), 1000);
    return () => clearInterval(t);
  }, [activeTrip]);

  async function startTrip() {
    if (!room || !userId) return;
    setStartingTrip(true);
    const { data: trip } = await supabase
      .from("trips")
      .insert({ room_id: room.id, user_id: userId, status: "active" })
      .select()
      .single();
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
    return <div className="flex items-center justify-center h-screen"><Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} /></div>;
  }

  if (!room) return null;

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {activeTrip
              ? <Radio size={16} className="animate-pulse-accent" style={{ color: "var(--accent)" }} />
              : <MapPin size={16} style={{ color: "var(--text-muted)" }} />}
            <h1 className="font-extrabold text-lg">{room.name}</h1>
          </div>
          {activeTrip && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold mono" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>LIVE</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Room code copy */}
          <button onClick={copyCode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold mono transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: codeCopied ? "var(--accent)" : "var(--text-dim)" }}>
            {codeCopied ? <Check size={12} /> : <Copy size={12} />}
            {room.code}
          </button>

          {/* Connection status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs mono"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: activeTrip ? "var(--accent)" : "var(--text-muted)" }}>
            {activeTrip ? <Wifi size={12} /> : <WifiOff size={12} />}
            {activeTrip ? "Connected" : "Idle"}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <TrackingMap
            points={points}
            isLive={!!activeTrip}
            className="h-full"
          />
        </div>

        {/* Side panel */}
        <div className="w-64 flex flex-col gap-3 flex-shrink-0">
          {/* Stats */}
          <div className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>TRIP STATS</div>
            <div className="space-y-3">
              <Stat icon={Clock} label="Duration" value={activeTrip ? elapsed || "00:00" : "—"} />
              <Stat icon={Navigation} label="Distance" value={totalDist > 0 ? formatDistance(totalDist) : "—"} />
              <Stat icon={MapPin} label="Points" value={points.length.toString()} />
              <Stat
                icon={Users}
                label="GPS"
                value={geo.accuracy ? `±${Math.round(geo.accuracy)}m` : "—"}
                accent={!!geo.isTracking}
              />
            </div>
          </div>

          {/* Controls — only owner */}
          {isOwner && (
            <div className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>CONTROLS</div>
              {!activeTrip ? (
                <button onClick={startTrip} disabled={startingTrip}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#0a0e1a", boxShadow: "0 0 20px var(--accent-glow)" }}>
                  {startingTrip ? <Loader2 size={15} className="animate-spin" /> : <><Play size={15} fill="currentColor" /> Start Trip</>}
                </button>
              ) : (
                <button onClick={stopTrip} disabled={stoppingTrip}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  {stoppingTrip ? <Loader2 size={15} className="animate-spin" /> : <><Square size={15} fill="currentColor" /> End Trip</>}
                </button>
              )}
            </div>
          )}

          {/* Share */}
          <div className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>SHARE THIS ROOM</div>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Anyone with this code can view the live map</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center py-2 rounded-xl mono text-lg font-extrabold tracking-widest"
                style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                {room.code}
              </div>
              <button onClick={copyCode}
                className="p-2.5 rounded-xl transition-all hover:opacity-80"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                {codeCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = false }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: accent ? "var(--accent)" : "var(--text-muted)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <span className="text-sm font-bold mono" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>{value}</span>
    </div>
  );
}
