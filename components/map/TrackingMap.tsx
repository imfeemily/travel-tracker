"use client";

import { useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import { LocationPoint } from "@/types";

interface TrackingMapProps {
  points: LocationPoint[];
  center?: [number, number];
  currentLocation?: [number, number] | null;
  zoom?: number;
  isLive?: boolean;
  className?: string;
}

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a9a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a2a3e" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c3e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212134" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6a6a7a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a5e" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d0d1a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a3a5a" }] },
];

interface RoutePolylineProps {
  points: LocationPoint[];
  isLive: boolean;
}

function RoutePolyline({ points, isLive }: RoutePolylineProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const lastLenRef = useRef(0);

  useEffect(() => {
    if (!map || !mapsLib || points.length === 0) return;

    const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));

    if (polylineRef.current) {
      polylineRef.current.setPath(path);
    } else {
      polylineRef.current = new mapsLib.Polyline({
        path,
        geodesic: true,
        strokeColor: "#06c167",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });
    }

    if (isLive && path.length !== lastLenRef.current) {
      map.panTo(path[path.length - 1]);
    }
    lastLenRef.current = path.length;
  }, [map, mapsLib, points, isLive]);

  useEffect(() => {
    return () => { polylineRef.current?.setMap(null); };
  }, []);

  return null;
}

interface MapOverlayProps {
  points: LocationPoint[];
  currentLocation?: [number, number] | null;
  isLive: boolean;
  center?: [number, number];
}

function MapOverlay({ points, currentLocation, isLive, center }: MapOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !center) return;
    map.panTo({ lat: center[0], lng: center[1] });
  }, [map, center]);

  useEffect(() => {
    if (!map || !currentLocation || points.length > 0) return;
    map.panTo({ lat: currentLocation[0], lng: currentLocation[1] });
  }, [map, currentLocation, points.length]);

  return (
    <>
      <RoutePolyline points={points} isLive={isLive} />

      {/* Start marker */}
      {points[0] && (
        <AdvancedMarker position={{ lat: points[0].lat, lng: points[0].lng }} zIndex={10}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#06c167", border: "2px solid #000",
            boxShadow: "0 0 0 2px #06c16744",
          }} />
        </AdvancedMarker>
      )}

      {/* Latest point marker (live pulse) */}
      {points.length > 0 && (
        <AdvancedMarker
          position={{ lat: points[points.length - 1].lat, lng: points[points.length - 1].lng }}
          zIndex={15}
        >
          <div style={{ position: "relative", width: 18, height: 18 }}>
            {isLive && (
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                background: "rgba(6,193,103,0.25)",
                animation: "ping-go 1.4s ease-out infinite",
              }} />
            )}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "#06c167", border: "3px solid #000",
              boxShadow: "0 2px 8px rgba(6,193,103,0.5)",
            }} />
          </div>
        </AdvancedMarker>
      )}

      {/* Current location dot */}
      {currentLocation && (
        <AdvancedMarker
          position={{ lat: currentLocation[0], lng: currentLocation[1] }}
          zIndex={20}
        >
          <div style={{ position: "relative", width: 16, height: 16 }}>
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "#fff", border: "3px solid #000",
              boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
            }} />
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}

export function TrackingMap({
  points,
  center,
  currentLocation,
  zoom = 15,
  isLive = false,
  className = "",
}: TrackingMapProps) {
  const defaultCenter =
    center
      ? { lat: center[0], lng: center[1] }
      : currentLocation
      ? { lat: currentLocation[0], lng: currentLocation[1] }
      : points[0]
      ? { lat: points[0].lat, lng: points[0].lng }
      : { lat: 13.7563, lng: 100.5018 };

  return (
    <div
      className={`w-full h-full overflow-hidden ${className}`}
      style={{ minHeight: 200, borderRadius: "var(--radius-lg)" }}
    >
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
        <Map
          mapId="trackr-map"
          defaultCenter={defaultCenter}
          defaultZoom={zoom}
          disableDefaultUI
          zoomControl
          gestureHandling="greedy"
          styles={DARK_MAP_STYLES}
          style={{ width: "100%", height: "100%" }}
        >
          <MapOverlay
            points={points}
            currentLocation={currentLocation}
            isLive={isLive}
            center={center}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
