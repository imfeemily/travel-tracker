"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Database, Trash2, RefreshCw,
  AlertTriangle, Check, Loader2, Shield, Bell, HardDrive, ChevronRight
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
      const sum = trips.filter((t) => t.retention_tier === 3);
      const arc = trips.filter((t) => t.retention_tier === 4);
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
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight mb-0.5">Settings</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Account and storage</p>
      </div>

      {/* Account */}
      <Section icon={Shield} title="Account">
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Email</div>
            <div className="text-sm font-medium">{email}</div>
          </div>
          <ChevronRight size={15} style={{ color: "var(--text-muted)" }} />
        </div>
      </Section>

      {/* Storage */}
      <Section icon={HardDrive} title="Storage">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Used</span>
            <span className="text-sm font-black mono">{usedMb} <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>/ 500 MB</span></span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: "var(--text)" }} />
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Full resolution", value: stats.full_resolution_trips, color: "var(--go)" },
              { label: "Downsampled", value: stats.downsampled_trips, color: "var(--warn)" },
              { label: "Summary only", value: stats.summary_only_trips, color: "var(--text-muted)" },
              { label: "Archived", value: stats.archived_trips, color: "var(--text-muted)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3" style={{ background: "var(--surface-2)", borderRadius: "var(--radius)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                <div className="text-xl font-black mono" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Retention */}
      <Section icon={Database} title="Data Retention">
        <div className="space-y-5">
          {/* Auto-purge toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Auto-purge</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Automatically downsize old trips</div>
            </div>
            <button
              onClick={() => setAutoPurge(!autoPurge)}
              className="w-12 h-6 rounded-full transition-all flex-shrink-0 relative"
              style={{ background: autoPurge ? "var(--go)" : "var(--surface-3)" }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow"
                style={{ left: autoPurge ? "calc(100% - 20px)" : "4px" }}
              />
            </button>
          </div>

          {/* Retention period */}
          <div>
            <div className="text-sm font-semibold mb-2">Retention period</div>
            <div className="flex gap-2">
              {[30, 60, 90, 180].map((d) => (
                <button
                  key={d}
                  onClick={() => setRetentionDays(d)}
                  className="flex-1 py-2 text-xs font-bold transition-all"
                  style={{
                    background: retentionDays === d ? "var(--text)" : "var(--surface-2)",
                    color: retentionDays === d ? "var(--bg)" : "var(--text-muted)",
                    borderRadius: "var(--radius-sm)",
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}
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
          <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Purge: downsample after 7d → summarize after 30d → archive after {retentionDays}d
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={runManualPurge}
                disabled={purging}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  borderRadius: "var(--radius)",
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
      </Section>

      {/* Danger zone */}
      <Section icon={AlertTriangle} title="Danger zone" danger>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Delete archived trips</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Permanently remove {stats?.archived_trips ?? 0} archived trips
            </div>
          </div>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-opacity hover:opacity-80"
              style={{ background: "rgba(225,25,0,0.08)", color: "var(--danger)", borderRadius: "var(--radius)", border: "1px solid rgba(225,25,0,0.2)" }}
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Cancel
              </button>
              <button
                onClick={deleteAllArchived}
                className="px-3 py-1.5 text-xs font-bold"
                style={{ background: "var(--danger)", color: "white", borderRadius: "var(--radius)" }}
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* Purge log */}
      {purgeLogs.length > 0 && (
        <Section icon={Bell} title="Purge log">
          <div className="uber-list">
            {purgeLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-3 text-xs">
                <span style={{ color: "var(--text-muted)" }}>
                  {new Date(log.executed_at).toLocaleDateString()} — Tier {log.tier_affected}
                </span>
                <span className="font-bold mono" style={{ color: "var(--go)" }}>
                  -{log.points_deleted} pts
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children, danger = false }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="mb-4"
      style={{
        background: "var(--surface)",
        border: `1px solid ${danger ? "rgba(225,25,0,0.2)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-2 px-5 py-3.5 border-b"
        style={{ borderColor: danger ? "rgba(225,25,0,0.15)" : "var(--border)" }}
      >
        <Icon size={13} style={{ color: danger ? "var(--danger)" : "var(--text-muted)" }} />
        <span className="text-xs font-black uppercase tracking-wider" style={{ color: danger ? "var(--danger)" : "var(--text-muted)" }}>
          {title}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
