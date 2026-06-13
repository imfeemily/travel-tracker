import Link from "next/link";
import { MapPin, Zap, Lock, History } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Subtle grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          opacity: 0.6,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--go)", boxShadow: "0 0 24px var(--go-glow)" }}
          >
            <MapPin size={16} color="#000" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-black tracking-tight">TrackR</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm font-medium rounded-xl transition-colors hover:bg-[var(--surface)]"
            style={{ color: "var(--text-muted)" }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm font-bold rounded-xl transition-opacity hover:opacity-85"
            style={{ background: "var(--go)", color: "#000" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{
            background: "var(--go-dim)",
            border: "1px solid var(--go-glow)",
            color: "var(--go)",
          }}
        >
          <span className="live-dot" style={{ width: 6, height: 6, background: "var(--go)" }} />
          Real-time GPS tracking
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-5 leading-none">
          Track every<br />
          <span style={{ color: "var(--go)" }}>journey.</span>
        </h1>
        <p className="text-base md:text-lg max-w-lg mb-10 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Create private rooms, share a 6-char code, and watch routes unfold live — right from your browser.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/auth/register"
            className="px-8 py-4 text-base font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--go)", color: "#000", boxShadow: "0 0 40px var(--go-glow)" }}
          >
            Start tracking free
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 text-base font-medium rounded-2xl transition-all hover:bg-[var(--surface)]"
            style={{ border: "1px solid var(--border)", color: "var(--text-dim)" }}
          >
            Sign in →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 md:px-10 pb-20">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Zap, title: "Live tracking", desc: "GPS points stream to the map every 5 seconds via Supabase Realtime." },
            { icon: Lock, title: "Private rooms", desc: "Generate a 6-char code and share it — only your people can watch." },
            { icon: History, title: "Trip history", desc: "Every trip is saved with full route replay and smart retention tiers." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-2xl"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--go-dim)" }}
              >
                <Icon size={18} style={{ color: "var(--go)" }} />
              </div>
              <h3 className="font-black text-sm mb-2">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
