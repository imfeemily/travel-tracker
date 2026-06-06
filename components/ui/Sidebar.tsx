"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MapPin, LayoutDashboard, History, Settings, LogOut, Radio } from "lucide-react";
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

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-16 md:w-56 flex flex-col py-6 px-3 md:px-4 z-50"
      style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-1 mb-8">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent)", boxShadow: "0 0 16px var(--accent-glow)" }}
        >
          <MapPin size={15} color="#0a0e1a" strokeWidth={2.5} />
        </div>
        <span className="hidden md:block text-base font-extrabold tracking-tight">TrackR</span>
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
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}

        {/* Active room indicator (shown when on /room) */}
        {pathname.startsWith("/room") && (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "rgba(0,212,170,0.08)", color: "var(--accent)" }}
          >
            <Radio size={18} className="animate-pulse-accent flex-shrink-0" />
            <span className="hidden md:block">Live room</span>
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
        <span className="hidden md:block">Sign out</span>
      </button>
    </aside>
  );
}
