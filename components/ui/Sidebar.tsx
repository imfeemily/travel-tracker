"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, History, Settings, LogOut, Radio, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/history", icon: History, label: "Trips" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userInitial, setUserInitial] = useState("?");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserInitial(user.email[0].toUpperCase());
    });
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const isRoom = pathname.startsWith("/room");

  return (
    <>
      {/* ── Desktop left sidebar ── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-50"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 animate-float"
              style={{
                background: "var(--go)",
                boxShadow: "0 0 20px var(--go-glow)",
              }}
            >
              <MapPin size={16} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight" style={{ color: "var(--text)" }}>TrackR</div>
              <div className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>GPS Tracker</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }, i) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all relative overflow-hidden"
                style={{
                  color: active ? "var(--text)" : "var(--text-muted)",
                  background: active ? "var(--surface-2)" : "transparent",
                  fontWeight: active ? 700 : 500,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full"
                    style={{
                      height: 20,
                      background: "var(--go)",
                      boxShadow: "0 0 8px var(--go-glow)",
                    }}
                  />
                )}
                <Icon
                  size={18}
                  className="flex-shrink-0"
                  strokeWidth={active ? 2.5 : 1.75}
                  style={{ color: active ? "var(--go)" : "var(--text-muted)" }}
                />
                {label}
              </Link>
            );
          })}

          {isRoom && (
            <div
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold mt-1 animate-slide-left"
              style={{ background: "var(--go-dim)", color: "var(--go)" }}
            >
              <Radio size={18} className="animate-pulse-go flex-shrink-0" strokeWidth={2.5} />
              Live room
              <span className="live-dot ml-auto" style={{ width: 6, height: 6 }} />
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-5 pt-3 flex-shrink-0 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all"
              style={{ background: "var(--surface-2)", color: "var(--go)", border: "1px solid var(--border)" }}
            >
              {mounted ? userInitial : "·"}
            </div>
            <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--text-dim)" }}>
              My account
            </span>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[var(--surface-2)] btn-press"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={16} className="flex-shrink-0" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
        style={{
          background: "rgba(18,18,18,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border-subtle)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)",
        }}
      >
        <div className="flex items-stretch">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-1 pt-3 pb-2 min-h-[56px] relative transition-all active:opacity-60"
                style={{ color: active ? "var(--go)" : "var(--text-muted)" }}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full nav-indicator"
                    style={{
                      width: 28, height: 2.5,
                      background: "var(--go)",
                      boxShadow: "0 0 8px var(--go-glow)",
                    }}
                  />
                )}
                <Icon size={21} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}

          {isRoom ? (
            <div
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-3 pb-2 min-h-[56px] relative"
              style={{ color: "var(--go)" }}
            >
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                style={{ width: 28, height: 2.5, background: "var(--go)", boxShadow: "0 0 8px var(--go-glow)" }}
              />
              <Radio size={21} strokeWidth={2.5} className="animate-pulse-go" />
              <span className="text-[10px] font-semibold">Live</span>
            </div>
          ) : (
            <button
              onClick={signOut}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-3 pb-2 min-h-[56px] transition-all active:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut size={21} strokeWidth={1.75} />
              <span className="text-[10px] font-semibold">Sign out</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
