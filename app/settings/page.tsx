"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setEmail(user.email ?? "");
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

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
      <div className="px-5 pt-8 pb-6 md:px-8 md:pt-10 animate-slide-down">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
          Preferences
        </p>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
      </div>

      <div className="px-5 md:px-8">
        <div
          className="rounded-2xl overflow-hidden animate-slide-up card-hover"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="flex items-center gap-2.5 px-5 py-3.5 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <Shield size={13} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Account
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Email
            </p>
            <p className="text-sm font-medium">{email}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
