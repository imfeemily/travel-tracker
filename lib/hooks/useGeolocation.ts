"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  isTracking: boolean;
}

interface UseGeolocationOptions {
  intervalMs?: number;
  onPosition?: (lat: number, lng: number, accuracy: number | null) => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { intervalMs = 5000, onPosition } = options;
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    isTracking: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation not supported" }));
      return;
    }

    setState((s) => ({ ...s, isTracking: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setState((s) => ({ ...s, lat, lng, accuracy }));

        const now = Date.now();
        if (now - lastSentRef.current >= intervalMs) {
          lastSentRef.current = now;
          onPosition?.(lat, lng, accuracy);
        }
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message, isTracking: false }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  }, [intervalMs, onPosition]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((s) => ({ ...s, isTracking: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...state, start, stop };
}
