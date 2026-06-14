"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Lang } from "@/lib/i18n/translations";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
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

  const LANGS: { value: Lang; label: string; native: string }[] = [
    { value: "en", label: "English", native: "English" },
    { value: "th", label: "Thai", native: "ภาษาไทย" },
  ];

  return (
    <div className="max-w-xl mx-auto pb-28 md:pb-8">

      {/* Header */}
      <div className="px-5 pt-8 pb-6 md:px-8 md:pt-10 animate-slide-down">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
          {t("settings_subtitle")}
        </p>
        <h1 className="text-3xl font-black tracking-tight">{t("settings_heading")}</h1>
      </div>

      <div className="px-5 md:px-8 flex flex-col gap-4">

        {/* Account */}
        <div
          className="rounded-2xl overflow-hidden animate-slide-up card-hover"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <Shield size={13} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {t("settings_account")}
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              {t("settings_email")}
            </p>
            <p className="text-sm font-medium">{email}</p>
          </div>
        </div>

        {/* Language */}
        <div
          className="rounded-2xl overflow-hidden animate-slide-up card-hover"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)", animationDelay: "60ms" }}
        >
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <Globe size={13} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {t("settings_language")}
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="flex gap-2">
              {LANGS.map(({ value, native }) => (
                <button
                  key={value}
                  onClick={() => setLang(value)}
                  className="flex-1 py-3 text-sm font-bold rounded-xl transition-all"
                  style={{
                    background: lang === value ? "var(--go)" : "var(--surface-2)",
                    color: lang === value ? "#000" : "var(--text-muted)",
                  }}
                >
                  {native}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
