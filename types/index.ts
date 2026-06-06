export type RetentionTier = 1 | 2 | 3 | 4;
export type TripStatus = "active" | "ended";
export type TriggerType = "scheduled" | "manual" | "user_request";

export interface Room {
  id: string;
  owner_id: string;
  name: string;
  code: string;
  is_active: boolean;
  retention_days: number;
  auto_purge_enabled: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  room_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  distance_km: number;
  status: TripStatus;
  retention_tier: RetentionTier;
  total_points: number;
  archived_at: string | null;
  auto_delete_at: string | null;
}

export interface LocationPoint {
  id: string;
  trip_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  recorded_at: string;
}

export interface TripSummary {
  id: string;
  trip_id: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  bounding_box: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  waypoints: Array<{ lat: number; lng: number }>;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
}

export interface PurgeLog {
  id: string;
  triggered_by: TriggerType;
  tier_affected: number;
  trips_affected: number;
  points_deleted: number;
  storage_freed_kb: number;
  executed_at: string;
}

export interface StorageStats {
  total_trips: number;
  full_resolution_trips: number;
  downsampled_trips: number;
  summary_only_trips: number;
  archived_trips: number;
  estimated_size_kb: number;
}

export interface RealtimeLocationPayload {
  tripId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  recordedAt: string;
}
