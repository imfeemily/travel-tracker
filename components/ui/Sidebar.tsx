"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, History, Settings, LogOut, Radio, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const isRoom = pathname.startsWith("/room");

  return (
    <>
      {/* ── Desktop left sidebar (md+) ── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-50"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--text)" }}
            >
              <MapPin size={16} color="var(--bg)" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight leading-none" style={{ color: "var(--text)" }}>TrackR</div>
              <div className="text-[10px] mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>GPS Tracker</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                  active ? "font-semibold" : "font-medium hover:bg-[var(--surface-2)]"
                )}
                style={{
                  color: active ? "var(--text)" : "var(--text-muted)",
                  background: active ? "var(--accent-dim)" : undefined,
                }}
              >
                <Icon size={18} className="flex-shrink-0" strokeWidth={active ? 2.5 : 1.75} />
                {label}
              </Link>
            );
          })}

          {isRoom && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold"
              style={{ background: "var(--go-dim)", color: "var(--go)" }}
            >
              <Radio size={18} className="animate-pulse-accent flex-shrink-0" strokeWidth={2.5} />
              Live room
            </div>
          )}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-5 pt-3 flex-shrink-0 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={18} className="flex-shrink-0" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch safe-bottom"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors active:bg-[var(--surface-2)]"
              style={{ color: active ? "var(--text)" : "var(--text-muted)" }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}

        {isRoom && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px]"
            style={{ color: "var(--go)" }}
          >
            <Radio size={22} strokeWidth={2.5} className="animate-pulse-accent" />
            <span className="text-[10px] font-semibold">Live</span>
          </div>
        )}

        <button
          onClick={signOut}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors active:bg-[var(--surface-2)]"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut size={22} strokeWidth={1.75} />
          <span className="text-[10px] font-semibold">Sign out</span>
        </button>
      </nav>
    </>
  );
}
