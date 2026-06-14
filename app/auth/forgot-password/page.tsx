"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (err) { setError(err.message); setLoading(false); } else { setSent(true); }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <div className="px-6 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "var(--text)" }}>
            <MapPin size={15} color="var(--bg)" strokeWidth={2.5} />
          </div>
          <span className="text-base font-black tracking-tight">TrackR</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm text-center animate-slide-up">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "var(--surface)" }}>
              <CheckCircle2 size={28} style={{ color: "var(--go)" }} />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">{t("forgot_sent_heading")}</h1>
            <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{t("forgot_sent_body")}</p>
            <p className="text-sm font-semibold mb-8 mono">{email}</p>
            <p className="text-xs mb-8" style={{ color: "var(--text-muted)" }}>
              {t("forgot_sent_no_email")}{" "}
              <button onClick={() => setSent(false)} className="font-semibold underline underline-offset-2" style={{ color: "var(--text)" }}>
                {t("forgot_sent_retry")}
              </button>.
            </p>
            <Link href="/auth/login" className="block w-full py-4 text-sm font-bold text-center transition-opacity hover:opacity-90" style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}>
              {t("forgot_sent_cta")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="px-6 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "var(--text)" }}>
          <MapPin size={15} color="var(--bg)" strokeWidth={2.5} />
        </div>
        <span className="text-base font-black tracking-tight">TrackR</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-slide-up">
          <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-8 transition-opacity hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft size={13} /> {t("forgot_back")}
          </Link>
          <h1 className="text-3xl font-black mb-1 tracking-tight">{t("forgot_heading")}</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>{t("forgot_subheading")}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>{t("forgot_email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                className="w-full px-4 py-3.5 text-sm outline-none transition-colors"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--text)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            {error && (
              <div className="px-4 py-3 text-sm" style={{ background: "rgba(225,25,0,0.08)", border: "1px solid rgba(225,25,0,0.25)", borderRadius: "var(--radius)", color: "var(--danger)" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading || !email.trim()} className="w-full py-4 text-sm font-bold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40 mt-2" style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : t("forgot_submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
