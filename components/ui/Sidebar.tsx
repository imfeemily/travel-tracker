"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LayoutDashboard, History, Settings, LogOut, Radio } from "lucide-react";
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
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col py-6 px-4 z-50"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-1 mb-8">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)", boxShadow: "0 0 16px var(--accent-glow)" }}
          >
            <Heart size={14} color="white" strokeWidth={2.5} fill="white" />
          </div>
          <span className="text-base font-extrabold tracking-tight">FamilyTrackr</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "text-[var(--accent)]"
                    : "hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
                style={active ? { background: "var(--accent-dim)" } : {}}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}

          {isRoom && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "rgba(168,85,247,0.08)", color: "var(--accent)" }}
            >
              <Radio size={18} className="animate-pulse-accent flex-shrink-0" />
              <span>Live room</span>
            </div>
          )}
        </nav>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 safe-area-inset-bottom"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all min-w-0"
              style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          );
        })}

        {isRoom && (
          <div
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl"
            style={{ color: "var(--accent)" }}
          >
            <Radio size={20} className="animate-pulse-accent" />
            <span className="text-[10px] font-semibold">Live</span>
          </div>
        )}

        <button
          onClick={signOut}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut size={20} />
          <span className="text-[10px] font-semibold">Sign out</span>
        </button>
      </nav>
    </>
  );
}
