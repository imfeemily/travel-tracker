export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg)" }}>
      {children}
    </div>
  );
}
