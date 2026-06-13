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
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col z-50"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--text)" }}
            >
              <MapPin size={15} color="var(--bg)" strokeWidth={2.5} />
            </div>
            <span className="text-base font-black tracking-tight" style={{ color: "var(--text)" }}>
              TrackR
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors",
                  active
                    ? "font-semibold"
                    : "hover:bg-[var(--surface-2)]"
                )}
                style={{
                  color: active ? "var(--text)" : "var(--text-muted)",
                  background: active ? "var(--accent-dim)" : undefined,
                }}
              >
                <Icon size={17} className="flex-shrink-0" />
                {label}
              </Link>
            );
          })}

          {isRoom && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded text-sm font-semibold"
              style={{ background: "var(--go-dim)", color: "var(--go)" }}
            >
              <Radio size={17} className="animate-pulse-accent flex-shrink-0" />
              Live room
            </div>
          )}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={17} className="flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
              style={{ color: active ? "var(--text)" : "var(--text-muted)" }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}

        {isRoom && (
          <div
            className="flex-1 flex flex-col items-center gap-1 py-3"
            style={{ color: "var(--go)" }}
          >
            <Radio size={20} strokeWidth={2.5} className="animate-pulse-accent" />
            <span className="text-[10px] font-semibold">Live</span>
          </div>
        )}

        <button
          onClick={signOut}
          className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut size={20} strokeWidth={1.75} />
          <span className="text-[10px] font-semibold">Sign out</span>
        </button>
      </nav>
    </>
  );
}
