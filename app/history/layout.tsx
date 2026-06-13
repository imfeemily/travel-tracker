import { Sidebar } from "@/components/ui/Sidebar";

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="flex-1 md:ml-64 overflow-y-auto pb-20 md:pb-0">{children}</main>
    </div>
  );
}
