import Link from "next/link";
import { MapPin, Zap, Lock, History } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "48px 48px", opacity: 0.3 }} />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" }}>
            <MapPin size={16} color="#0a0e1a" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight">TrackR</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="px-4 py-2 text-sm font-medium transition-colors" style={{ color: "var(--text-dim)" }}>Sign in</Link>
          <Link href="/auth/register" className="px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-90" style={{ background: "var(--accent)", color: "#0a0e1a", boxShadow: "0 0 20px var(--accent-glow)" }}>Get Started</Link>
        </div>
      </nav>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 mono" style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-glow)", color: "var(--accent)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-accent" style={{ background: "var(--accent)" }} />
          Real-time GPS tracking
        </div>
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 leading-none">
          Track every<br />
          <span style={{ color: "var(--accent)", textShadow: "0 0 60px var(--accent-glow)" }}>journey.</span>
        </h1>
        <p className="text-lg max-w-xl mb-12" style={{ color: "var(--text-dim)" }}>Create private rooms, share a code, and watch routes unfold on a live map — from your browser, no app needed.</p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/auth/register" className="px-8 py-4 text-base font-bold rounded-xl transition-all hover:scale-105" style={{ background: "var(--accent)", color: "#0a0e1a", boxShadow: "0 0 40px var(--accent-glow)" }}>Start tracking free</Link>
          <Link href="/auth/login" className="px-8 py-4 text-base font-medium rounded-xl" style={{ border: "1px solid var(--border)", color: "var(--text-dim)" }}>Sign in →</Link>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: "Live tracking", desc: "GPS points stream to your map every 5 seconds via Supabase Realtime." },
            { icon: Lock, title: "Private rooms", desc: "Generate a 6-char code and share it. Only invited viewers can watch." },
            { icon: History, title: "Trip history", desc: "Every trip is stored with route replay. Smart purge keeps storage lean." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-dim)" }}>
                <Icon size={18} style={{ color: "var(--accent)" }} />
              </div>
              <h3 className="font-bold text-base mb-1">{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
