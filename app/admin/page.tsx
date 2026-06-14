"use client";

import { useEffect, useState } from "react";
import {
  Users, MapPin, Navigation, Database,
  Activity, TrendingUp, Clock, Loader2, RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Stats {
  totalUsers: number;
  totalRooms: number;
  activeTrips: number;
  totalTrips: number;
  totalPoints: number;
  recentPurgeLogs: Array<{
    id: string;
    triggered_by: string;
    tier_affected: number;
    trips_affected: number;
    points_deleted: number;
    storage_freed_kb: number;
    executed_at: string;
  }>;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/admin/api/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const kpis = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "var(--accent, #8b5cf6)" },
        { label: "Rooms", value: stats.totalRooms, icon: MapPin, color: "var(--go)" },
        { label: "Active Trips", value: stats.activeTrips, icon: Activity, color: "var(--go)", live: stats.activeTrips > 0 },
        { label: "Total Trips", value: stats.totalTrips, icon: Navigation, color: "var(--text-muted)" },
        { label: "Location Points", value: stats.totalPoints.toLocaleString(), icon: TrendingUp, color: "var(--text-muted)" },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 pt-8 pb-12 md:px-8 md:pt-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-slide-down">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--danger)" }}>
            Admin
          </p>
          <h1 className="text-2xl font-black tracking-tight">Overview</h1>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all btn-press"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {kpis.map(({ label, value, icon: Icon, color, live }, i) => (
          <div
            key={label}
            className="px-5 py-5 rounded-2xl animate-scale-in"
            style={{
              background: "var(--surface)",
              boxShadow: "var(--shadow-card)",
              animationDelay: `${i * 60}ms`,
            }}
          >
            <Icon
              size={14}
              className={`mb-3 ${live ? "animate-float" : ""}`}
              style={{ color }}
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

      {/* Purge logs */}
      <div
        className="rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Database size={14} style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Recent purge runs
          </span>
        </div>

        {stats?.recentPurgeLogs.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Clock size={20} className="mx-auto mb-3" style={{ color: "var(--border)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No purge runs yet</p>
          </div>
        ) : (
          <div>
            {stats?.recentPurgeLogs.map((log, i) => (
              <div
                key={log.id}
                className="flex items-center gap-4 px-5 py-3.5"
                style={{
                  borderBottom: i < (stats.recentPurgeLogs.length - 1) ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <div
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  Tier {log.tier_affected}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                    {log.trips_affected} trips · {log.points_deleted.toLocaleString()} pts deleted
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {log.storage_freed_kb.toFixed(1)} KB freed · {log.triggered_by}
                  </div>
                </div>
                <div className="text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {formatDistanceToNow(new Date(log.executed_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
