import { Sidebar } from "@/components/ui/Sidebar";

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="flex-1 md:ml-64 overflow-hidden pb-16 md:pb-0">{children}</main>
    </div>
  );
}
