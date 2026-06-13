"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Database, Trash2, RefreshCw,
  AlertTriangle, Check, Loader2, Shield, Bell, HardDrive
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StorageStats, PurgeLog } from "@/types";
import { estimateTripSizeKb } from "@/utils";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [purgeLogs, setPurgeLogs] = useState<PurgeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [autoPurge, setAutoPurge] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setEmail(user.email ?? "");

    const { data: trips } = await supabase
      .from("trips")
      .select("retention_tier, total_points")
      .eq("user_id", user.id)
      .eq("status", "ended");

    if (trips) {
      const full = trips.filter((t) => t.retention_tier === 1);
      const down = trips.filter((t) => t.retention_tier === 2);
      const sum  = trips.filter((t) => t.retention_tier === 3);
      const arc  = trips.filter((t) => t.retention_tier === 4);
      const sizeKb = trips.reduce((acc, t) => acc + estimateTripSizeKb(t.total_points, t.retention_tier), 0);
      setStats({
        total_trips: trips.length,
        full_resolution_trips: full.length,
        downsampled_trips: down.length,
        summary_only_trips: sum.length,
        archived_trips: arc.length,
        estimated_size_kb: sizeKb,
      });
    }

    const { data: logs } = await supabase
      .from("purge_logs")
      .select("*")
      .order("executed_at", { ascending: false })
      .limit(5);
    setPurgeLogs(logs ?? []);

    const { data: firstRoom } = await supabase
      .from("rooms")
      .select("retention_days, auto_purge_enabled")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();
    if (firstRoom) {
      setRetentionDays(firstRoom.retention_days);
      setAutoPurge(firstRoom.auto_purge_enabled);
    }

    setLoading(false);
  }, [supabase, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function saveRetentionSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    setSaveMsg("");
    await supabase.from("rooms").update({ retention_days: retentionDays, auto_purge_enabled: autoPurge }).eq("owner_id", user.id);
    setSaveMsg("Saved");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function runManualPurge() {
    setPurging(true);
    setPurgeMsg("");
    try {
      const res = await fetch("/api/purge", { method: "POST" });
      setPurgeMsg(res.ok ? "Purge completed" : "Purge failed");
    } catch {
      setPurgeMsg("Network error");
    }
    setPurging(false);
    setTimeout(() => setPurgeMsg(""), 3000);
    load();
  }

  async function deleteAllArchived() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: archivedTrips } = await supabase.from("trips").select("id").eq("user_id", user.id).eq("retention_tier", 4);
    if (archivedTrips) {
      for (const t of archivedTrips) {
        await supabase.from("trip_summaries").delete().eq("trip_id", t.id);
        await supabase.from("trips").delete().eq("id", t.id);
      }
    }
    setDeleteConfirm(false);
    load();
  }

  const usedMb = ((stats?.estimated_size_kb ?? 0) / 1024).toFixed(1);
  const usedPct = Math.min(((stats?.estimated_size_kb ?? 0) / (500 * 1024)) * 100, 100);

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
      <div className="px-5 pt-8 pb-6 md:px-8 md:pt-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
          Preferences
        </p>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
      </div>

      <div className="px-5 md:px-8 flex flex-col gap-4">

        {/* Account */}
        <Card icon={Shield} title="Account">
          <div className="flex items-center justify-between py-0.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Email
              </p>
              <p className="text-sm font-medium">{email}</p>
            </div>
          </div>
        </Card>

        {/* Storage */}
        <Card icon={HardDrive} title="Storage">
          <div className="mb-5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Used storage</span>
              <span className="text-sm font-black mono">
                {usedMb} <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>/ 500 MB</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${usedPct}%`, background: "var(--go)" }}
              />
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Full res", value: stats.full_resolution_trips, color: "var(--go)" },
                { label: "Downsampled", value: stats.downsampled_trips, color: "var(--warn)" },
                { label: "Summary", value: stats.summary_only_trips, color: "var(--text-dim)" },
                { label: "Archived", value: stats.archived_trips, color: "var(--text-muted)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3.5 rounded-xl" style={{ background: "var(--surface-2)" }}>
                  <div className="text-xs mb-1.5 font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
                  <div className="text-2xl font-black mono" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Retention */}
        <Card icon={Database} title="Data Retention">
          <div className="flex flex-col gap-5">
            {/* Auto-purge toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold mb-0.5">Auto-purge</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Downsize old trips automatically</p>
              </div>
              <button
                onClick={() => setAutoPurge(!autoPurge)}
                className="w-12 h-6.5 rounded-full transition-all flex-shrink-0 relative"
                style={{
                  width: 48, height: 28,
                  background: autoPurge ? "var(--go)" : "var(--surface-3)",
                }}
              >
                <div
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md"
                  style={{ left: autoPurge ? "calc(100% - 22px)" : "4px" }}
                />
              </button>
            </div>

            {/* Retention period */}
            <div>
              <p className="text-sm font-semibold mb-3">Retention period</p>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 180].map((d) => (
                  <button
                    key={d}
                    onClick={() => setRetentionDays(d)}
                    className="py-2.5 text-xs font-bold rounded-xl transition-all"
                    style={{
                      background: retentionDays === d ? "var(--go)" : "var(--surface-2)",
                      color: retentionDays === d ? "#000" : "var(--text-muted)",
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <button
                onClick={saveRetentionSettings}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "var(--go)", color: "#000" }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </button>
              {saveMsg && (
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--go)" }}>
                  <Check size={11} /> {saveMsg}
                </span>
              )}
            </div>

            {/* Manual purge */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Downsample after 7d → summarize after 30d → archive after {retentionDays}d
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={runManualPurge}
                  disabled={purging}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all disabled:opacity-40"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {purging ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Run purge now
                </button>
                {purgeMsg && (
                  <span className="text-xs font-semibold" style={{ color: "var(--go)" }}>{purgeMsg}</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card icon={AlertTriangle} title="Danger zone" danger>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-0.5">Delete archived trips</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Permanently remove {stats?.archived_trips ?? 0} archived trips
              </p>
            </div>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-opacity hover:opacity-80"
                style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid rgba(255,61,61,0.2)" }}
              >
                <Trash2 size={12} /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ color: "var(--text-muted)" }}>
                  Cancel
                </button>
                <button
                  onClick={deleteAllArchived}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg"
                  style={{ background: "var(--danger)", color: "white" }}
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Purge log */}
        {purgeLogs.length > 0 && (
          <Card icon={Bell} title="Purge log">
            <div className="flex flex-col gap-0">
              {purgeLogs.map((log, i) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2.5 text-xs"
                  style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}
                >
                  <span style={{ color: "var(--text-muted)" }}>
                    {new Date(log.executed_at).toLocaleDateString()} — Tier {log.tier_affected}
                  </span>
                  <span className="font-bold mono" style={{ color: "var(--text-dim)" }}>
                    -{log.points_deleted} pts
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children, danger = false }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface)",
        border: danger ? "1px solid rgba(255,61,61,0.15)" : "none",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b"
        style={{ borderColor: danger ? "rgba(255,61,61,0.10)" : "var(--border-subtle)" }}
      >
        <Icon size={13} style={{ color: danger ? "var(--danger)" : "var(--text-muted)" }} />
        <span
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: danger ? "var(--danger)" : "var(--text-muted)" }}
        >
          {title}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
