"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm text-center animate-slide-up">
          <CheckCircle2 size={48} className="mx-auto mb-6" style={{ color: "var(--go)" }} />
          <h2 className="text-2xl font-black mb-2 tracking-tight">Check your inbox</h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            We sent a confirmation link to{" "}
            <span className="font-semibold" style={{ color: "var(--text)" }}>{email}</span>
          </p>
          <Link
            href="/auth/login"
            className="block w-full py-4 text-sm font-bold text-center transition-opacity hover:opacity-90"
            style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text)",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="px-6 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "var(--text)" }}>
          <MapPin size={15} color="var(--bg)" strokeWidth={2.5} />
        </div>
        <span className="text-base font-black tracking-tight">TrackR</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-slide-up">
          <h1 className="text-3xl font-black mb-1 tracking-tight">Create account</h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            Start tracking your journeys for free
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="w-full px-4 py-3.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--text)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" required
                  className="w-full px-4 py-3.5 pr-12 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--text)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                Confirm password
              </label>
              <input
                type={showPass ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password" required
                className="w-full px-4 py-3.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--text)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {error && (
              <div className="px-4 py-3 text-sm"
                style={{ background: "rgba(225,25,0,0.08)", border: "1px solid rgba(225,25,0,0.25)", borderRadius: "var(--radius)", color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-4 text-sm font-bold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40 mt-2"
              style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "var(--radius)" }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold" style={{ color: "var(--text)" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
