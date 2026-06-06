"use client";

import { useEffect, useRef } from "react";
import type { Map, Polyline, Marker } from "leaflet";
import { LocationPoint } from "@/types";

interface TrackingMapProps {
  points: LocationPoint[];
  center?: [number, number];
  zoom?: number;
  isLive?: boolean;
  className?: string;
}

export function TrackingMap({
  points,
  center,
  zoom = 15,
  isLive = false,
  className = "",
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const polylineRef = useRef<Polyline | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const startMarkerRef = useRef<Marker | null>(null);

  function drawRoute(L: typeof import("leaflet"), map: Map) {
    const latlngs: [number, number][] = points.map((p) => [p.lat, p.lng]);

    // Polyline
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs);
    } else {
      polylineRef.current = L.polyline(latlngs, {
        color: "#00d4aa",
        weight: 3,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    }

    // Start marker
    if (!startMarkerRef.current && latlngs.length > 0) {
      const startIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:#00d4aa;border:2px solid #0a0e1a;box-shadow:0 0 8px rgba(0,212,170,0.6)"></div>`,
        className: "",
        iconAnchor: [6, 6],
      });
      startMarkerRef.current = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
    }

    // Current position marker (live or last point)
    const last = latlngs[latlngs.length - 1];
    const livePulse = isLive
      ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(0,212,170,0.3);animation:ping-accent 1.5s ease-out infinite"></div>`
      : "";
    const curIcon = L.divIcon({
      html: `<div style="position:relative;width:16px;height:16px">
        ${livePulse}
        <div style="position:absolute;inset:0;border-radius:50%;background:#00d4aa;border:2.5px solid #0a0e1a;box-shadow:0 0 12px rgba(0,212,170,0.8)"></div>
      </div>`,
      className: "",
      iconAnchor: [8, 8],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(last);
      markerRef.current.setIcon(curIcon);
    } else {
      markerRef.current = L.marker(last, { icon: curIcon }).addTo(map);
    }

    // Pan to last point if live
    if (isLive) map.panTo(last, { animate: true, duration: 0.5 });
  }

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const defaultCenter: [number, number] = center ?? (points[0] ? [points[0].lat, points[0].lng] : [13.7563, 100.5018]);

      const map = L.map(containerRef.current!, {
        center: defaultCenter,
        zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Zoom control bottom-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapRef.current = map;

      // Draw initial points
      if (points.length > 0) drawRoute(L, map);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update route when points change
  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    (async () => {
      const L = (await import("leaflet")).default;
      drawRoute(L, mapRef.current!);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: 300 }}
    />
  );
}
