"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Radio, Trash2, Loader2, MapPin,
  Clock, Navigation, ChevronRight, X, ArrowUpRight
} from "lucide-react";
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
  const [userEmail, setUserEmail] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setUserId(user.id);
    setUserEmail(user.email ?? "");

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
    if (!data) { setJoinError("Room not found — check the code and try again"); setJoining(false); return; }
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
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const activeRoom = rooms.find(r => activeTrips.some(t => t.room_id === r.id));

  return (
    <div className="max-w-xl mx-auto pb-28 md:pb-8">

      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-6 md:px-8 md:pt-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
          {userEmail ? userEmail.split("@")[0] : "Dashboard"}
        </p>
        <h1 className="text-3xl font-black tracking-tight">Good to go.</h1>
      </div>

      {/* ── Live banner ── */}
      {activeTrips.length > 0 && activeRoom && (
        <div className="px-5 md:px-8 mb-5 animate-slide-down">
          <Link
            href={`/room/${activeRoom.code}`}
            className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-opacity active:opacity-80"
            style={{
              background: "var(--go)",
              boxShadow: "0 0 32px var(--go-glow)",
            }}
          >
            <span className="live-dot flex-shrink-0" style={{ background: "#000" }} />
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm" style={{ color: "#000" }}>Trip in progress</p>
              <p className="text-xs font-medium mt-0.5 truncate" style={{ color: "rgba(0,0,0,0.6)" }}>
                {activeRoom.name}
              </p>
            </div>
            <ArrowUpRight size={18} style={{ color: "#000" }} className="flex-shrink-0" />
          </Link>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="px-5 md:px-8 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rooms", value: rooms.length, icon: MapPin },
            { label: "Active", value: activeTrips.length, icon: Navigation, live: activeTrips.length > 0 },
            { label: "Status", value: activeTrips.length > 0 ? "Live" : "Idle", icon: Clock, live: activeTrips.length > 0 },
          ].map(({ label, value, icon: Icon, live }) => (
            <div
              key={label}
              className="px-4 py-4 rounded-2xl"
              style={{
                background: "var(--surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <Icon
                size={13}
                className="mb-3"
                style={{ color: live ? "var(--go)" : "var(--text-muted)" }}
              />
              <div
                className="text-2xl font-black tracking-tight leading-none mb-1"
                style={{ color: live ? "var(--go)" : "var(--text)" }}
              >
                {value}
              </div>
              <div className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Join room ── */}
      <div className="px-5 md:px-8 mb-6">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-5 pt-4 pb-3">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Join a room
            </p>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              placeholder="Enter 6-char code"
              maxLength={6}
              className="flex-1 px-4 py-3.5 text-sm outline-none transition-colors mono tracking-[0.2em] font-bold"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--go)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            />
            <button
              onClick={joinRoom}
              disabled={joining || joinCode.trim().length !== 6}
              className="px-5 py-3.5 text-sm font-bold flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-30"
              style={{ background: "var(--go)", color: "#000", borderRadius: "var(--radius)" }}
            >
              {joining ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
              Join
            </button>
          </div>
          {joinError && (
            <p className="px-5 pb-4 text-xs font-medium" style={{ color: "var(--danger)" }}>{joinError}</p>
          )}
        </div>
      </div>

      {/* ── Rooms ── */}
      <div className="px-5 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-base tracking-tight">Your rooms</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all active:opacity-70"
            style={showCreate
              ? { background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }
              : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }
            }
          >
            {showCreate ? <X size={13} /> : <Plus size={13} />}
            {showCreate ? "Cancel" : "New room"}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div
            className="mb-4 p-4 rounded-2xl animate-slide-down"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Room name
            </p>
            <div className="flex gap-2">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="e.g. School run, Family trip"
                autoFocus
                className="flex-1 px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--text)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--go)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
              />
              <button
                onClick={createRoom}
                disabled={creating || !newRoomName.trim()}
                className="px-5 py-3 text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ background: "var(--go)", color: "#000", borderRadius: "var(--radius)" }}
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Rooms list */}
        {rooms.length === 0 ? (
          <div
            className="py-16 text-center rounded-2xl"
            style={{ border: "1px dashed var(--border)", background: "var(--surface)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--surface-2)" }}
            >
              <MapPin size={22} style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm font-semibold mb-1">No rooms yet</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Create a room to start tracking
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
          >
            {rooms.map((room, i) => {
              const isActive = activeTrips.some((t) => t.room_id === room.id);
              const isLast = i === rooms.length - 1;
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] group"
                  style={{
                    minHeight: 72,
                    borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
                  }}
                  onClick={() => router.push(`/room/${room.code}`)}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: isActive ? "var(--go-dim)" : "var(--surface-2)",
                      boxShadow: isActive ? "0 0 0 1px var(--go-glow)" : "none",
                    }}
                  >
                    {isActive
                      ? <Radio size={16} style={{ color: "var(--go)" }} className="animate-pulse-go" />
                      : <MapPin size={16} style={{ color: "var(--text-muted)" }} />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate mb-0.5">{room.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs mono font-bold" style={{ color: "var(--text-muted)" }}>
                        {room.code}
                      </span>
                      {isActive && (
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                          style={{ background: "var(--go-dim)", color: "var(--go)" }}
                        >
                          LIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }}
                      className="md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg transition-all"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
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
