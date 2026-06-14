"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, MapPin, Navigation,
  Database, ArrowLeft, ShieldCheck, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview", exact: true },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/rooms", icon: MapPin, label: "Rooms" },
  { href: "/admin/trips", icon: Navigation, label: "Trips" },
  { href: "/admin/retention", icon: Database, label: "Retention" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col z-50"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Header */}
        <div className="px-4 py-5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--danger)", boxShadow: "0 0 16px rgba(239,68,68,0.3)" }}
            >
              <ShieldCheck size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xs font-black tracking-tight" style={{ color: "var(--text)" }}>TrackR Admin</div>
              <div className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Back office</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-1 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative"
                style={{
                  color: active ? "var(--text)" : "var(--text-muted)",
                  background: active ? "var(--surface-2)" : "transparent",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full"
                    style={{ height: 18, background: "var(--danger)", boxShadow: "0 0 6px rgba(239,68,68,0.5)" }}
                  />
                )}
                <Icon
                  size={16}
                  className="flex-shrink-0"
                  strokeWidth={active ? 2.5 : 1.75}
                  style={{ color: active ? "var(--danger)" : "var(--text-muted)" }}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2.5 pb-5 pt-3 flex-shrink-0 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[var(--surface-2)] mb-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Back to app
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={16} strokeWidth={1.75} className="flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <nav
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(18,18,18,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--danger)" }}
        >
          <ShieldCheck size={13} color="#fff" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-black flex-1">Admin</span>
        <div className="flex items-center gap-1">
          {NAV.map(({ href, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="p-2 rounded-lg"
                style={{ color: active ? "var(--danger)" : "var(--text-muted)", background: active ? "var(--surface-2)" : "transparent" }}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.75} />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
