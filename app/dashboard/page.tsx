"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Hash, ArrowRight, Radio, Trash2, Loader2, MapPin, Clock, Navigation, ChevronRight } from "lucide-react";
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
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text)",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight mb-0.5">Dashboard</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Manage rooms and active trips
        </p>
      </div>

      {/* Live trip banner */}
      {activeTrips.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3.5 mb-6 animate-fade-in"
          style={{ background: "var(--go-dim)", border: "1px solid rgba(6,193,103,0.2)", borderRadius: "var(--radius)" }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--go)" }} />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-60" style={{ background: "var(--go)" }} />
          </div>
          <p className="text-sm font-semibold flex-1" style={{ color: "var(--go)" }}>
            {activeTrips.length} trip{activeTrips.length > 1 ? "s" : ""} in progress
          </p>
          <Link
            href={`/room/${rooms.find(r => activeTrips.some(t => t.room_id === r.id))?.code ?? ""}`}
            className="text-xs font-bold flex items-center gap-1"
            style={{ color: "var(--go)" }}
          >
            View <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: MapPin, label: "Rooms", value: rooms.length },
          { icon: Navigation, label: "Active", value: activeTrips.length },
          { icon: Clock, label: "Status", value: activeTrips.length > 0 ? "Live" : "Idle" },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="px-4 py-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
          >
            <Icon size={14} className="mb-3" style={{ color: "var(--text-muted)" }} />
            <div className="text-xl font-black tracking-tight">{value}</div>
            <div className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Join room */}
      <div
        className="p-5 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Join a room
        </p>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
            placeholder="Room code"
            maxLength={6}
            className={`${inputClass} mono tracking-widest font-bold flex-1`}
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--text)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          />
          <button
            onClick={joinRoom}
            disabled={joining || !joinCode.trim()}
            className="px-5 py-3 text-sm font-bold flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}
          >
            {joining ? <Loader2 size={14} className="animate-spin" /> : <><Radio size={13} /> Join</>}
          </button>
        </div>
        {joinError && (
          <p className="text-xs mt-2 font-medium" style={{ color: "var(--danger)" }}>{joinError}</p>
        )}
      </div>

      {/* Rooms list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-base tracking-tight">Your rooms</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-colors"
            style={{
              background: showCreate ? "var(--surface-2)" : "var(--text)",
              color: showCreate ? "var(--text)" : "var(--bg)",
              borderRadius: "var(--radius)",
              border: showCreate ? "1px solid var(--border)" : "none",
            }}
          >
            <Plus size={13} /> New room
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div
            className="mb-4 p-4 animate-slide-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}
          >
            <div className="flex gap-2">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name e.g. School run"
                className={`${inputClass} flex-1`}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--text)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
              />
              <button
                onClick={createRoom}
                disabled={creating || !newRoomName.trim()}
                className="px-5 py-3 text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
        )}

        {rooms.length === 0 ? (
          <div
            className="py-16 text-center"
            style={{ border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)" }}
          >
            <MapPin size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              No rooms yet — create one to start
            </p>
          </div>
        ) : (
          <div
            className="uber-list overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
          >
            {rooms.map((room) => {
              const isActive = activeTrips.some((t) => t.room_id === room.id);
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--surface-2)] group"
                  onClick={() => router.push(`/room/${room.code}`)}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center"
                    style={{ background: isActive ? "var(--go-dim)" : "var(--surface-2)" }}
                  >
                    {isActive
                      ? <Radio size={15} style={{ color: "var(--go)" }} className="animate-pulse-accent" />
                      : <MapPin size={15} style={{ color: "var(--text-muted)" }} />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{room.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs mono font-bold" style={{ color: "var(--text-muted)" }}>
                        {room.code}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--go)" }}>
                          ● LIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded transition-all hover:bg-red-500/10"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={15} style={{ color: "var(--text-muted)" }} />
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
