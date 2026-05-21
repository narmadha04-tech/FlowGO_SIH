import * as THREE from 'three';

export type SignalState = 'red' | 'yellow' | 'green';
export type SignalId = 'A' | 'B' | 'C';
export type VehicleType = 'car' | 'bike' | 'auto' | 'bus';
export type LaneDirection = 'straight' | 'left' | 'right';

export interface TrafficSignal {
  id: SignalId;
  state: SignalState;
  position: THREE.Vector3;
  rotation: number;
  mesh?: THREE.Group;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  mesh: THREE.Group;
  path: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
  baseSpeed: number;
  lane: LaneDirection;
  signalId: SignalId;
  stopped: boolean;
  stopPosition: number;
}

export interface SimulationState {
  isRunning: boolean;
  autoCycle: boolean;
  currentSignal: SignalId;
  vehicleDensity: number;
  speedMultiplier: number;
  signals: Record<SignalId, TrafficSignal>;
  vehicles: Vehicle[];
  timeRemaining: number;
  currentPhase: SignalState;
}

export interface TimingConfig {
  green: number;
  yellow: number;
  red: number;
}

export const TIMING_CONFIG: TimingConfig = {
  green: 45,
  yellow: 5,
  red: 60,
};

export const VEHICLE_COLORS: Record<VehicleType, number[]> = {
  car: [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c],
  bike: [0x34495e, 0x7f8c8d, 0x2c3e50],
  auto: [0xf1c40f, 0x27ae60],
  bus: [0xe74c3c, 0x2980b9, 0x8e44ad],
};

export const VEHICLE_DIMENSIONS: Record<VehicleType, { length: number; width: number; height: number }> = {
  car: { length: 4, width: 2, height: 1.5 },
  bike: { length: 2, width: 0.8, height: 1.2 },
  auto: { length: 3, width: 1.8, height: 2 },
  bus: { length: 10, width: 2.5, height: 3 },
};


