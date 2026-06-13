"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LocationPoint } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeTrackingOptions {
  tripId: string | null;
  onNewPoint?: (point: LocationPoint) => void;
}

export function useRealtimeTracking({
  tripId,
  onNewPoint,
}: UseRealtimeTrackingOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  // Always call the latest onNewPoint without resubscribing
  const onNewPointRef = useRef(onNewPoint);
  useEffect(() => { onNewPointRef.current = onNewPoint; }, [onNewPoint]);

  const subscribe = useCallback(() => {
    if (!tripId) return;

    channelRef.current = supabase
      .channel(`trip:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_points",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          onNewPointRef.current?.(payload.new as LocationPoint);
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === "SUBSCRIBED");
      });
  }, [tripId, supabase]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsSubscribed(false);
    }
  }, [supabase]);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  return { isSubscribed, unsubscribe };
}
