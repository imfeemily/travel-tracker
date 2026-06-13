"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Settings, Database, Trash2, RefreshCw, ChevronRight,
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

    // Storage stats
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

    // Purge logs
    const { data: logs } = await supabase
      .from("purge_logs")
      .select("*")
      .order("executed_at", { ascending: false })
      .limit(5);
    setPurgeLogs(logs ?? []);

    // Room settings (use first room as default)
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
    await supabase
      .from("rooms")
      .update({ retention_days: retentionDays, auto_purge_enabled: autoPurge })
      .eq("owner_id", user.id);
    setSaveMsg("Settings saved");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function runManualPurge() {
    setPurging(true);
    setPurgeMsg("");
    try {
      const res = await fetch("/api/purge", { method: "POST" });
      setPurgeMsg(res.ok ? "Purge completed successfully" : "Purge failed — check Edge Function logs");
    } catch {
      setPurgeMsg("Purge failed — network error");
    }
    setPurging(false);
    setTimeout(() => setPurgeMsg(""), 3000);
    load();
  }

  async function deleteAllArchived() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: archivedTrips } = await supabase
      .from("trips")
      .select("id")
      .eq("user_id", user.id)
      .eq("retention_tier", 4);

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
    return <div className="flex items-center justify-center min-h-screen"><Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} /></div>;
  }

  return (
    <div className="p-4 md:p-10 max-w-3xl">
      <div className="mb-6 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">Settings</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Account and storage management</p>
      </div>

      {/* Account */}
      <Section icon={Shield} title="Account">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Email</div>
            <div className="text-sm mono mt-0.5" style={{ color: "var(--text-muted)" }}>{email}</div>
          </div>
          <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
        </div>
      </Section>

      {/* Storage Overview */}
      <Section icon={HardDrive} title="Storage">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Used</span>
            <span className="text-sm mono font-bold">{usedMb} MB <span style={{ color: "var(--text-muted)" }}>/ 500 MB</span></span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }} />
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Full resolution", value: stats.full_resolution_trips, color: "var(--accent)" },
              { label: "Downsampled", value: stats.downsampled_trips, color: "var(--warn)" },
              { label: "Summary only", value: stats.summary_only_trips, color: "var(--text-muted)" },
              { label: "Archived", value: stats.archived_trips, color: "var(--text-muted)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
                <div className="text-xl font-extrabold mono mt-0.5" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Purge Settings */}
      <Section icon={Database} title="Data Retention">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto-purge</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Automatically downsize old trips</div>
            </div>
            <button onClick={() => setAutoPurge(!autoPurge)}
              className="w-11 h-6 rounded-full transition-all flex-shrink-0 relative"
              style={{ background: autoPurge ? "var(--accent)" : "var(--surface-2)" }}>
              <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: autoPurge ? "calc(100% - 20px)" : "4px" }} />
            </button>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Retention period</div>
            <div className="flex gap-2">
              {[30, 60, 90, 180].map((d) => (
                <button key={d} onClick={() => setRetentionDays(d)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: retentionDays === d ? "var(--accent-dim)" : "var(--surface-2)",
                    color: retentionDays === d ? "var(--accent)" : "var(--text-muted)",
                    border: `1px solid ${retentionDays === d ? "var(--accent-glow)" : "transparent"}`,
                  }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={saveRetentionSettings} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "white" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save settings
            </button>
            {saveMsg && (
              <span className="text-xs mono flex items-center gap-1" style={{ color: "var(--accent)" }}>
                <Check size={11} /> {saveMsg}
              </span>
            )}
          </div>

          <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Purge schedule: downsample after 7d → summarize after 30d → archive after {retentionDays}d
            </div>
            <button onClick={runManualPurge} disabled={purging}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-glow)" }}>
              {purging ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Run purge now
            </button>
            {purgeMsg && (
              <div className="flex items-center gap-2 mt-2 text-xs mono" style={{ color: "var(--accent)" }}>
                <Check size={12} /> {purgeMsg}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section icon={AlertTriangle} title="Danger Zone" danger>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Delete all archived trips</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Permanently remove {stats?.archived_trips ?? 0} archived trips</div>
          </div>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Trash2 size={13} /> Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: "var(--text-muted)" }}>Cancel</button>
              <button onClick={deleteAllArchived}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "var(--danger)", color: "white" }}>
                Confirm delete
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* Purge logs */}
      {purgeLogs.length > 0 && (
        <Section icon={Bell} title="Purge Log">
          <div className="space-y-2">
            {purgeLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs mono py-2 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}>
                <div style={{ color: "var(--text-muted)" }}>
                  {new Date(log.executed_at).toLocaleDateString()} — Tier {log.tier_affected}
                </div>
                <div style={{ color: "var(--accent)" }}>
                  -{log.points_deleted} pts
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children, danger = false }: {
  icon: React.ElementType; title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className="mb-6 p-6 rounded-2xl" style={{ background: "var(--surface)", border: `1px solid ${danger ? "rgba(239,68,68,0.2)" : "var(--border)"}` }}>
      <div className="flex items-center gap-2 mb-5">
        <Icon size={15} style={{ color: danger ? "var(--danger)" : "var(--accent)" }} />
        <h2 className="font-bold text-sm" style={{ color: danger ? "var(--danger)" : "var(--text-dim)" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
