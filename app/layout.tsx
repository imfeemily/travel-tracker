import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackR — Real-time Travel Tracker",
  description: "Track your journeys in real-time, share your route with a room code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
