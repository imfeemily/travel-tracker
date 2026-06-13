import Link from "next/link";
import { MapPin, Zap, Lock, History } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* Animated grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          opacity: 0.5,
          animation: "fade-in 1.5s ease both",
        }}
      />

      {/* Extra floating orb for landing only */}
      <div
        className="fixed pointer-events-none"
        style={{
          width: 400, height: 400,
          top: "30%", left: "40%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,230,118,0.05) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "orb-drift-a 14s ease-in-out infinite alternate",
        }}
      />

      {/* Nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6 animate-slide-down"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-center gap-2.5 animate-float">
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
            className="px-4 py-2 text-sm font-medium rounded-xl transition-all hover:bg-[var(--surface)] link-underline"
            style={{ color: "var(--text-muted)" }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 text-sm font-bold rounded-xl btn-glow"
            style={{ background: "var(--go)", color: "#000" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-8 animate-scale-in"
          style={{
            background: "var(--go-dim)",
            border: "1px solid var(--go-glow)",
            color: "var(--go)",
            animationDelay: "100ms",
          }}
        >
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          Real-time GPS tracking
        </div>

        <h1
          className="text-5xl md:text-7xl font-black tracking-tighter mb-5 leading-none animate-slide-up"
          style={{ animationDelay: "180ms" }}
        >
          Track every<br />
          <span className="text-gradient">journey.</span>
        </h1>

        <p
          className="text-base md:text-lg max-w-lg mb-10 leading-relaxed animate-slide-up"
          style={{ color: "var(--text-muted)", animationDelay: "260ms" }}
        >
          Create private rooms, share a 6-char code, and watch routes unfold live — right from your browser.
        </p>

        <div
          className="flex flex-col sm:flex-row items-center gap-3 animate-slide-up"
          style={{ animationDelay: "340ms" }}
        >
          <Link
            href="/auth/register"
            className="px-8 py-4 text-base font-bold rounded-2xl btn-glow"
            style={{ background: "var(--go)", color: "#000", boxShadow: "0 0 40px var(--go-glow)" }}
          >
            Start tracking free
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 text-base font-medium rounded-2xl btn-press"
            style={{ border: "1px solid var(--border)", color: "var(--text-dim)" }}
          >
            Sign in →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 md:px-10 pb-20">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 stagger-children">
          {[
            { icon: Zap, title: "Live tracking", desc: "GPS points stream to the map every 5 seconds via Supabase Realtime.", delay: "400ms" },
            { icon: Lock, title: "Private rooms", desc: "Generate a 6-char code and share it — only your people can watch.", delay: "480ms" },
            { icon: History, title: "Trip history", desc: "Every trip is saved with full route replay and smart retention tiers.", delay: "560ms" },
          ].map(({ icon: Icon, title, desc, delay }) => (
            <div
              key={title}
              className="p-6 rounded-2xl card-hover animate-slide-up"
              style={{
                background: "var(--surface)",
                boxShadow: "var(--shadow-card)",
                animationDelay: delay,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 animate-float"
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
