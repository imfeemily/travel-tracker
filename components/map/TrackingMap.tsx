"use client";

import { useEffect, useRef } from "react";
import type { Map, Polyline, Marker, Circle } from "leaflet";
import { LocationPoint } from "@/types";

interface TrackingMapProps {
  points: LocationPoint[];
  center?: [number, number];
  currentLocation?: [number, number] | null;
  zoom?: number;
  isLive?: boolean;
  className?: string;
}

export function TrackingMap({
  points,
  center,
  currentLocation,
  zoom = 15,
  isLive = false,
  className = "",
}: TrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const polylineRef = useRef<Polyline | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const startMarkerRef = useRef<Marker | null>(null);
  const currentLocMarkerRef = useRef<Marker | null>(null);
  const currentLocCircleRef = useRef<Circle | null>(null);
  // Refs so async init can read latest prop values after awaits
  const currentLocationRef = useRef(currentLocation);
  const pointsRef = useRef(points);
  useEffect(() => { currentLocationRef.current = currentLocation; }, [currentLocation]);
  useEffect(() => { pointsRef.current = points; }, [points]);

  function drawRoute(L: typeof import("leaflet"), map: Map) {
    const latlngs: [number, number][] = points.map((p) => [p.lat, p.lng]);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs);
    } else {
      polylineRef.current = L.polyline(latlngs, {
        color: "#06c167",
        weight: 4,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    }

    if (!startMarkerRef.current && latlngs.length > 0) {
      const startIcon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:#06c167;border:2px solid #000;box-shadow:0 0 0 2px #06c16744"></div>`,
        className: "",
        iconAnchor: [5, 5],
      });
      startMarkerRef.current = L.marker(latlngs[0], { icon: startIcon }).addTo(map);
    }

    const last = latlngs[latlngs.length - 1];
    const pulse = isLive
      ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(6,193,103,0.25);animation:ping-go 1.4s ease-out infinite"></div>`
      : "";
    const curIcon = L.divIcon({
      html: `<div style="position:relative;width:18px;height:18px">
        ${pulse}
        <div style="position:absolute;inset:0;border-radius:50%;background:#06c167;border:3px solid #000;box-shadow:0 2px 8px rgba(6,193,103,0.5)"></div>
      </div>`,
      className: "",
      iconAnchor: [9, 9],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(last);
      markerRef.current.setIcon(curIcon);
    } else {
      markerRef.current = L.marker(last, { icon: curIcon }).addTo(map);
    }

    if (isLive) map.panTo(last, { animate: true, duration: 0.5 });
  }

  function drawCurrentLocation(L: typeof import("leaflet"), map: Map, loc: [number, number]) {
    const icon = L.divIcon({
      html: `<div style="position:relative;width:16px;height:16px">
        <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(255,255,255,0.15)"></div>
        <div style="position:absolute;inset:0;border-radius:50%;background:#fff;border:3px solid #000;box-shadow:0 2px 6px rgba(0,0,0,0.6)"></div>
      </div>`,
      className: "",
      iconAnchor: [8, 8],
    });

    if (currentLocMarkerRef.current) {
      currentLocMarkerRef.current.setLatLng(loc);
    } else {
      currentLocMarkerRef.current = L.marker(loc, { icon }).addTo(map);
    }

    if (currentLocCircleRef.current) {
      currentLocCircleRef.current.setLatLng(loc);
    } else {
      currentLocCircleRef.current = L.circle(loc, {
        radius: 40,
        color: "#ffffff",
        fillColor: "#ffffff",
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.3,
      }).addTo(map);
    }
  }

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let destroyed = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Component may have unmounted during the async imports
      if (destroyed || !containerRef.current) return;

      // Use refs to get latest prop values after the async gap
      const latestLoc = currentLocationRef.current;
      const latestPoints = pointsRef.current;
      const defaultCenter: [number, number] =
        center ?? latestLoc ?? (latestPoints[0] ? [latestPoints[0].lat, latestPoints[0].lng] : [13.7563, 100.5018]);

      const map = L.map(containerRef.current, {
        center: defaultCenter,
        zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapRef.current = map;

      if (latestPoints.length > 0) drawRoute(L, map);
      if (latestLoc) {
        drawCurrentLocation(L, map, latestLoc);
        if (latestPoints.length === 0) map.panTo(latestLoc, { animate: false });
      }
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        polylineRef.current = null;
        markerRef.current = null;
        startMarkerRef.current = null;
        currentLocMarkerRef.current = null;
        currentLocCircleRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update route when points change
  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;
      drawRoute(L, mapRef.current);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // Update current-location dot
  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!mapRef.current) return;
      drawCurrentLocation(L, mapRef.current, currentLocation);
      if (points.length === 0) {
        mapRef.current.panTo(currentLocation, { animate: true, duration: 0.8 });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden ${className}`}
      style={{ minHeight: 200, borderRadius: "var(--radius-lg)" }}
    />
  );
}
