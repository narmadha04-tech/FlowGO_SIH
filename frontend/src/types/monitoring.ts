export interface MonitoringStats {
  active_signals: number;
  incidents: number;
  green_corridors: number;
  avg_response_min: number;
}

export interface MonitoringEvent {
  time: string;
  event: string;
  type: "success" | "warning" | "info";
}

export interface MonitoringSignal {
  id: string;
  location: string;
  status: "active" | "maintenance";
  timing: string;
  mode: "auto" | "manual" | "priority";
  queue?: number;
  eta_gain?: number;
}

export interface MonitoringCamera {
  id: string;
  location: string;
  status: "online" | "offline";
}

export interface MonitoringCorridor {
  id: number;
  type: string;
  route: string;
  eta: string;
  mode: "ai" | "manual";
}

export interface MonitoringTraffic {
  hourlyVolume: Array<{ hour: string; volume: number }>;
  weeklyIncidents: Array<{ day: string; incidents: number }>;
}

export interface MonitoringTraining {
  algo: string;
  avg_wait_ai: number;
  avg_wait_baseline: number;
  improvement_pct: number;
  avg_reward?: number;
  best_reward?: number;
  dataset_size?: number;
}

export interface MonitoringCameraSummary {
  feeds: MonitoringCamera[];
  online: number;
  offline: number;
  networkHealth?: number;
  avgResponseMs?: number;
  alerts?: number;
  live_counts?: Record<string, number>;
}

export interface MonitoringCorridorPayload {
  active: MonitoringCorridor[];
}

export interface MonitoringMapSignal {
  id: number;
  position: [number, number];
  status: "green" | "red" | "yellow";
}

export interface MonitoringMapPayload {
  center: [number, number];
  signals: MonitoringMapSignal[];
  corridorPath: [number, number][];
  vehicles: Array<{ id: number; position: [number, number]; type: string }>;
}

export interface HeatmapLane {
  lane_id: string;
  position: [number, number];
  congestion: number;
  halting: number;
  occupancy: number;
  speed: number;
  approach: string;
}

export interface HeatmapData {
  lanes: HeatmapLane[];
  updated_at?: number;
}

export interface MonitoringPayload {
  stats: MonitoringStats;
  recent_events: MonitoringEvent[];
  signals: MonitoringSignal[];
  traffic: MonitoringTraffic;
  corridors: MonitoringCorridorPayload;
  cameras: MonitoringCameraSummary;
  training: MonitoringTraining;
  map?: MonitoringMapPayload;
  heatmap?: HeatmapData;
  updated_at?: number;
}

