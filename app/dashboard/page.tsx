"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Hash, ArrowRight, Radio, Trash2, Loader2, MapPin, Clock, Navigation } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Room, Trip } from "@/types";
import { generateRoomCode } from "@/utils";
import Link from "next/link";

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setUserId(user.id);

    const [{ data: roomData }, { data: tripData }] = await Promise.all([
      supabase.from("rooms").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("trips").select("*").eq("user_id", user.id).eq("status", "active"),
    ]);

    setRooms(roomData ?? []);
    setActiveTrips(tripData ?? []);
    setLoading(false);
  }, [supabase, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function createRoom() {
    if (!newRoomName.trim() || !userId) return;
    setCreating(true);
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ owner_id: userId, name: newRoomName.trim(), code })
      .select()
      .single();
    if (!error && data) {
      setRooms((r) => [data, ...r]);
      setNewRoomName("");
      setShowCreate(false);
      router.push(`/room/${data.code}`);
    }
    setCreating(false);
  }

  async function joinRoom() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    const { data } = await supabase.from("rooms").select("*").eq("code", joinCode.trim().toUpperCase()).single();
    if (!data) { setJoinError("Room not found"); setJoining(false); return; }
    router.push(`/room/${data.code}`);
  }

  async function deleteRoom(roomId: string) {
    if (!confirm("Delete this room and all its trips?")) return;
    await supabase.from("rooms").delete().eq("id", roomId);
    setRooms((r) => r.filter((rm) => rm.id !== roomId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Manage your tracking rooms and active trips</p>
      </div>

      {/* Active trips banner */}
      {activeTrips.length > 0 && (
        <div className="mb-8 p-4 rounded-2xl flex items-center gap-4 animate-fade-in" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-glow)" }}>
          <div className="relative flex-shrink-0">
            <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />
            <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: "var(--accent)", opacity: 0.5 }} />
          </div>
          <p className="text-sm font-semibold flex-1" style={{ color: "var(--accent)" }}>
            {activeTrips.length} active trip{activeTrips.length > 1 ? "s" : ""} in progress
          </p>
          <Link href={`/room/${rooms.find(r => activeTrips.some(t => t.room_id === r.id))?.code ?? ""}`}
            className="text-xs font-bold flex items-center gap-1" style={{ color: "var(--accent)" }}>
            View <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { icon: MapPin, label: "Total rooms", value: rooms.length },
          { icon: Navigation, label: "Active trips", value: activeTrips.length },
          { icon: Clock, label: "Tracking", value: activeTrips.length > 0 ? "Live" : "Idle" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Icon size={16} className="mb-2" style={{ color: "var(--accent)" }} />
            <div className="text-2xl font-extrabold mono">{value}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Join room */}
      <div className="mb-8 p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
          <Hash size={14} /> Join a room
        </h2>
        <div className="flex gap-3">
          <input
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
            placeholder="Enter room code"
            maxLength={6}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none mono tracking-widest font-bold"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          />
          <button onClick={joinRoom} disabled={joining || !joinCode.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "var(--accent)", color: "#0a0e1a" }}>
            {joining ? <Loader2 size={14} className="animate-spin" /> : <><Radio size={14} /> Join</>}
          </button>
        </div>
        {joinError && <p className="text-xs mt-2 mono" style={{ color: "var(--danger)" }}>{joinError}</p>}
      </div>

      {/* Rooms list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Your rooms</h2>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: showCreate ? "var(--surface-2)" : "var(--accent-dim)", color: showCreate ? "var(--text)" : "var(--accent)", border: "1px solid var(--border)" }}>
            <Plus size={14} /> New room
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-4 p-4 rounded-2xl animate-slide-up" style={{ background: "var(--surface)", border: "1px solid var(--accent-glow)" }}>
            <div className="flex gap-3">
              <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name e.g. Morning run"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                onKeyDown={(e) => e.key === "Enter" && createRoom()} />
              <button onClick={createRoom} disabled={creating || !newRoomName.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: "var(--accent)", color: "#0a0e1a" }}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="py-16 text-center rounded-2xl" style={{ border: "1px dashed var(--border)" }}>
            <MapPin size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No rooms yet — create one to start tracking</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room) => {
              const isActive = activeTrips.some((t) => t.room_id === room.id);
              return (
                <div key={room.id} className="p-5 rounded-2xl flex items-center gap-4 group hover:border-[var(--accent)] transition-all cursor-pointer"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  onClick={() => router.push(`/room/${room.code}`)}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isActive ? "var(--accent-dim)" : "var(--surface-2)" }}>
                    {isActive
                      ? <Radio size={18} style={{ color: "var(--accent)" }} className="animate-pulse-accent" />
                      : <MapPin size={18} style={{ color: "var(--text-muted)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{room.name}</div>
                    <div className="text-xs mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Code: <span style={{ color: "var(--accent)" }}>{room.code}</span>
                      {isActive && <span className="ml-2" style={{ color: "var(--accent)" }}>● LIVE</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all hover:bg-red-500/10"
                      style={{ color: "var(--danger)" }}>
                      <Trash2 size={14} />
                    </button>
                    <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
