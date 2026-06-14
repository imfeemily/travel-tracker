"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type PageState = "waiting" | "ready" | "done" | "expired";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [pageState, setPageState] = useState<PageState>("waiting");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPageState("ready");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState("ready");
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError(t("reset_err_mismatch")); return; }
    if (password.length < 6) { setError(t("reset_err_short")); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); }
    else { setPageState("done"); setTimeout(() => router.push("/dashboard"), 2500); }
  }

  const inputStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)" };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="px-6 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "var(--text)" }}>
          <MapPin size={15} color="var(--bg)" strokeWidth={2.5} />
        </div>
        <span className="text-base font-black tracking-tight">TrackR</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        {pageState === "waiting" && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("reset_waiting")}</p>
          </div>
        )}

        {pageState === "expired" && (
          <div className="w-full max-w-sm text-center animate-slide-up">
            <p className="text-2xl mb-2 font-black">{t("reset_expired_heading")}</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{t("reset_expired_body")}</p>
            <a href="/auth/forgot-password" className="block w-full py-4 text-sm font-bold text-center" style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}>
              {t("reset_expired_cta")}
            </a>
          </div>
        )}

        {pageState === "ready" && (
          <div className="w-full max-w-sm animate-slide-up">
            <h1 className="text-3xl font-black mb-1 tracking-tight">{t("reset_heading")}</h1>
            <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>{t("reset_subheading")}</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>{t("reset_new_password")}</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("reset_password_placeholder")} required
                    className="w-full px-4 py-3.5 pr-12 text-sm outline-none transition-colors" style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--text)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>{t("reset_confirm")}</label>
                <input type={showPass ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("reset_confirm_placeholder")} required
                  className="w-full px-4 py-3.5 text-sm outline-none transition-colors" style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--text)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
              {password.length > 0 && (
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = Math.min(Math.floor(password.length / 3) + (/[A-Z]/.test(password) ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^a-zA-Z0-9]/.test(password) ? 1 : 0), 4);
                    const color = strength <= 1 ? "var(--danger)" : strength === 2 ? "var(--warn)" : "var(--go)";
                    return <div key={level} className="flex-1 h-1 rounded-full transition-all" style={{ background: level <= strength ? color : "var(--border)" }} />;
                  })}
                </div>
              )}
              {error && (
                <div className="px-4 py-3 text-sm" style={{ background: "rgba(225,25,0,0.08)", border: "1px solid rgba(225,25,0,0.25)", borderRadius: "var(--radius)", color: "var(--danger)" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || !password || !confirm} className="w-full py-4 text-sm font-bold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40 mt-2" style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}>
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : t("reset_submit")}
              </button>
            </form>
          </div>
        )}

        {pageState === "done" && (
          <div className="w-full max-w-sm text-center animate-slide-up">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "var(--surface)" }}>
              <CheckCircle2 size={28} style={{ color: "var(--go)" }} />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight">{t("reset_done_heading")}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("reset_done_body")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
