"""
data_collector_env.py
---------------------
SUMO gymnasium environment instrumented with YOLO-based vehicle counts.
The environment exposes lane queue lengths, waiting times and live camera
counts to a DQN agent that decides which signal phase to activate.
"""

from __future__ import annotations

import json
import os
import shutil
import time
from collections import deque
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Sequence, Tuple

import gymnasium as gym
import numpy as np
from gymnasium import spaces

try:
    import traci  # type: ignore
except ImportError:  # pragma: no cover - import guarded for non-SUMO hosts
    traci = None


DEFAULT_APPROACHES = ["north", "east", "south", "west"]
DEFAULT_PHASES = [
    ("NS_MAIN", "GGGrrrGGGrrr"),
    ("EW_MAIN", "rrrGGGrrrGGG"),
]


class ExperienceLogger:
    """Streams per-step metrics to disk so that FastAPI dashboard can read them."""

    def __init__(self, log_dir: Path, max_rows: int = 10_000) -> None:
        self.log_dir = log_dir
        self.max_rows = max_rows
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.csv_path = self.log_dir / "transitions.csv"
        self.heatmap_path = self.log_dir / "heatmap.json"
        if not self.csv_path.exists():
            self.csv_path.write_text(
                "step,phase,queue_ns,queue_ew,wait_ns,wait_ew,reward\n", encoding="utf-8"
            )
        self.rows = 0
        self.heatmap_data: Dict[str, List[Dict[str, Any]]] = {}

    def write(self, step: int, phase: str, queue_ns: float, queue_ew: float, wait_ns: float, wait_ew: float, reward: float) -> None:
        if self.rows >= self.max_rows:
            return
        with self.csv_path.open("a", encoding="utf-8") as csv_file:
            csv_file.write(f"{step},{phase},{queue_ns:.2f},{queue_ew:.2f},{wait_ns:.2f},{wait_ew:.2f},{reward:.4f}\n")
        self.rows += 1

    def update_heatmap(self, lane_data: List[Dict[str, Any]]) -> None:
        """Update heat map data with lane positions and congestion levels."""
        self.heatmap_data["lanes"] = lane_data
        self.heatmap_data["updated_at"] = time.time()
        try:
            self.heatmap_path.write_text(json.dumps(self.heatmap_data, indent=2), encoding="utf-8")
        except Exception:
            pass


class CameraCountBuffer:
    """Keeps the latest YOLO counts from CCTV feeds."""

    def __init__(self, approaches: Sequence[str], max_len: int = 60) -> None:
        self.approaches = approaches
        self.buffer: Dict[str, Deque[int]] = {a: deque(maxlen=max_len) for a in approaches}

    def update_from_file(self, counts_path: Optional[Path]) -> None:
        if not counts_path or not counts_path.exists():
            return
        try:
            payload = json.loads(counts_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return
        for approach in self.approaches:
            value = int(payload.get(approach, 0))
            self.buffer[approach].append(value)

    def as_feature_vector(self) -> np.ndarray:
        features: List[float] = []
        for approach in self.approaches:
            series = self.buffer[approach]
            if series:
                features.extend([float(series[-1]), float(np.mean(series))])
            else:
                features.extend([0.0, 0.0])
        return np.array(features, dtype=np.float32)


class SumoTrafficEnv(gym.Env[np.ndarray, int]):
    """
    Discrete-action SUMO environment used by the DQN agent.

    Observation vector:
        [queue_per_approach, waiting_time_per_approach,
         time_since_phase_change, current_phase_norm, camera_counts...]
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        sumo_config: str,
        route_file: Optional[str] = None,
        approaches: Optional[Sequence[str]] = None,
        phases: Optional[Sequence[Tuple[str, str]]] = None,
        step_length: float = 1.0,
        delta_time: int = 5,
        max_steps: int = 3600,
        min_green: int = 5,
        max_green: int = 60,
        gui: bool = False,
        traffic_light_id: str = "TL",  # Must match tlLogic id in network file
        reward_weights: Optional[Dict[str, float]] = None,
        camera_counts_path: Optional[str] = None,
        log_dir: Optional[str] = None,
    ) -> None:
        if traci is None:  # pragma: no cover - runtime guard for environments without SUMO
            raise ImportError("traci is not available. Please install SUMO and set SUMO_HOME.")

        self.sumo_config = sumo_config
        self.route_file = route_file
        self.approaches = list(approaches or DEFAULT_APPROACHES)
        self.phases = list(phases or DEFAULT_PHASES)
        self.step_length = float(step_length)
        self.delta_time = int(delta_time)
        self.max_steps = int(max_steps)
        self.min_green = int(min_green)
        self.max_green = int(max_green)
        self.gui = gui
        self.traffic_light_id = traffic_light_id
        self.reward_weights = reward_weights or {"queue": 0.6, "wait": 0.3, "phase_switch": 0.1}
        self.camera_counts_path = Path(camera_counts_path) if camera_counts_path else None
        self.camera_buffer = CameraCountBuffer(self.approaches)
        self.logger = ExperienceLogger(Path(log_dir) if log_dir else Path("artifacts/logs"))

        self.port = self._get_free_port()
        self.time_since_phase_change = 0
        self.current_phase_index = 0
        self.step_count = 0
        self.last_queue_snapshot: Dict[str, float] = {a: 0.0 for a in self.approaches}

        # Observation space: queue + wait (per approach) + 2 scalars + camera features
        obs_len = len(self.approaches) * 2 + 2 + len(self.approaches) * 2
        self.observation_space = spaces.Box(low=0.0, high=1.0, shape=(obs_len,), dtype=np.float32)
        self.action_space = spaces.Discrete(len(self.phases))

        self._sumo_binary = os.environ.get("SUMO_BINARY")
        if not self._sumo_binary:
            self._sumo_binary = shutil.which("sumo-gui" if gui else "sumo") or "sumo"

        self._traci_conn = None

    # ------------------------------------------------------------------
    # Gym core
    # ------------------------------------------------------------------
    def reset(self, route_override: Optional[str] = None, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[np.ndarray, Dict]:
        super().reset(seed=seed)
        self.close()

        self.route_file = route_override or self.route_file
        self._launch_traci()
        self.time_since_phase_change = 0
        self.current_phase_index = 0
        self.step_count = 0
        obs = self._compute_observation()
        return obs, {}

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        if action < 0 or action >= len(self.phases):
            raise ValueError(f"Invalid action {action}")

        terminated = False
        truncated = False

        # Apply action (change phase if needed)
        if action != self.current_phase_index and self.time_since_phase_change >= self.min_green:
            self._set_phase(action)
            self.time_since_phase_change = 0
        else:
            self.time_since_phase_change += self.delta_time

        # Step simulation for delta_time seconds
        for _ in range(self.delta_time):
            self._traci_conn.simulationStep()
            self.step_count += 1
            if self.step_count >= self.max_steps:
                terminated = True
                break

        obs = self._compute_observation()
        reward, info = self._compute_reward(obs)
        truncated = self.step_count >= self.max_steps

        queue_ns = float(self.last_queue_snapshot.get("north", 0.0) + self.last_queue_snapshot.get("south", 0.0))
        queue_ew = float(self.last_queue_snapshot.get("east", 0.0) + self.last_queue_snapshot.get("west", 0.0))
        wait_ns = info.get("wait_ns", 0.0)
        wait_ew = info.get("wait_ew", 0.0)
        self.logger.write(self.step_count, self.phases[self.current_phase_index][0], queue_ns, queue_ew, wait_ns, wait_ew, reward)
        return obs, reward, terminated, truncated, info

    def close(self) -> None:
        if self._traci_conn is not None:
            try:
                self._traci_conn.close(False)
            except Exception:
                pass
            self._traci_conn = None

    # ------------------------------------------------------------------
    # SUMO helpers
    # ------------------------------------------------------------------
    def _launch_traci(self) -> None:
        # Don't add --remote-port here, traci.start() handles it via port parameter
        cmd = [self._sumo_binary, "-c", self.sumo_config, "--step-length", str(self.step_length)]
        if self.route_file:
            cmd.extend(["--route-files", self.route_file])
        if not self.gui:
            cmd.append("--start")

        traci.start(cmd, port=self.port, label=f"adaptive-{self.port}")
        self._traci_conn = traci.getConnection(f"adaptive-{self.port}")
        
        # Auto-detect traffic light ID if default doesn't exist
        available_tls = self._traci_conn.trafficlight.getIDList()
        if available_tls and self.traffic_light_id not in available_tls:
            self.traffic_light_id = available_tls[0]
            print(f"[INFO] Using traffic light: {self.traffic_light_id}")
        
        if self.traffic_light_id in available_tls:
            self._traci_conn.trafficlight.setPhase(self.traffic_light_id, 0)
            self._set_phase(0)
        else:
            print(f"[WARN] No traffic lights found in network. Continuing without TL control.")

    def _set_phase(self, phase_index: int) -> None:
        self.current_phase_index = phase_index
        if not self._traci_conn:
            return
        try:
            tl_ids = self._traci_conn.trafficlight.getIDList()
            if not tl_ids or self.traffic_light_id not in tl_ids:
                return  # No traffic lights available, skip phase setting
            _, phase_definition = self.phases[phase_index]
            self._traci_conn.trafficlight.setRedYellowGreenState(self.traffic_light_id, phase_definition)
        except Exception:
            pass  # Silently fail if traffic lights aren't available

    def _get_lane_metrics(self) -> Tuple[np.ndarray, np.ndarray]:
        queues = []
        waits = []
        lane_ids = self._traci_conn.lane.getIDList()
        heatmap_lanes = []
        
        for approach in self.approaches:
            lanes = [lane for lane in lane_ids if lane.startswith(approach[0])]
            queue_len = sum(self._traci_conn.lane.getLastStepHaltingNumber(lane) for lane in lanes)
            waiting_time = sum(self._traci_conn.lane.getWaitingTime(lane) for lane in lanes)
            queues.append(queue_len)
            waits.append(waiting_time)
            self.last_queue_snapshot[approach] = queue_len
            
            # Collect heat map data for each lane
            for lane_id in lanes:
                try:
                    shape = self._traci_conn.lane.getShape(lane_id)
                    if shape and len(shape) >= 2:
                        # Use midpoint of lane for heat point
                        mid_idx = len(shape) // 2
                        lon, lat = shape[mid_idx]
                        halting = self._traci_conn.lane.getLastStepHaltingNumber(lane_id)
                        occupancy = self._traci_conn.lane.getLastStepOccupancy(lane_id)
                        speed = self._traci_conn.lane.getLastStepMeanSpeed(lane_id)
                        max_speed = self._traci_conn.lane.getMaxSpeed(lane_id)
                        
                        # Congestion intensity: combination of halting vehicles, occupancy, and speed reduction
                        congestion = min(1.0, (halting / 10.0) + (occupancy / 100.0) + (1.0 - min(1.0, speed / max_speed if max_speed > 0 else 1.0)))
                        
                        heatmap_lanes.append({
                            "lane_id": lane_id,
                            "position": [lat, lon],
                            "congestion": float(congestion),
                            "halting": int(halting),
                            "occupancy": float(occupancy),
                            "speed": float(speed),
                            "approach": approach
                        })
                except Exception:
                    continue
        
        # Update heat map every 10 steps to reduce I/O
        if self.step_count % 10 == 0 and heatmap_lanes:
            self.logger.update_heatmap(heatmap_lanes)
        
        return np.array(queues, dtype=np.float32), np.array(waits, dtype=np.float32)

    # ------------------------------------------------------------------
    # Observation & Reward
    # ------------------------------------------------------------------
    def _compute_observation(self) -> np.ndarray:
        queues, waits = self._get_lane_metrics()
        queues_norm = np.clip(queues / 40.0, 0.0, 1.0)
        waits_norm = np.clip(waits / 300.0, 0.0, 1.0)
        time_norm = np.array(
            [
                min(1.0, self.time_since_phase_change / float(self.max_green)),
                self.current_phase_index / max(1, len(self.phases) - 1),
            ],
            dtype=np.float32,
        )
        self.camera_buffer.update_from_file(self.camera_counts_path)
        camera_features = self.camera_buffer.as_feature_vector()
        obs = np.concatenate([queues_norm, waits_norm, time_norm, np.clip(camera_features / 50.0, 0.0, 1.0)]).astype(np.float32)
        return obs

    def _compute_reward(self, obs: np.ndarray) -> Tuple[float, Dict]:
        queue_features = obs[: len(self.approaches)]
        wait_features = obs[len(self.approaches) : len(self.approaches) * 2]

        # Enhanced reward function with congestion-aware penalties
        # Quadratic penalty for high congestion (more severe)
        queue_penalty = np.sum(np.power(queue_features, 1.5))  # Non-linear penalty
        wait_penalty = np.sum(np.power(wait_features, 1.3))  # Slightly non-linear for waiting
        
        # Penalty for premature phase switches
        phase_penalty = 1.0 if self.time_since_phase_change < self.min_green else 0.0
        
        # Bonus for maintaining flow when queues are low
        flow_bonus = 0.1 * (1.0 - np.mean(queue_features)) if np.mean(queue_features) < 0.3 else 0.0
        
        # Penalty for extreme congestion (emergency situation)
        max_congestion = np.max(queue_features)
        emergency_penalty = 2.0 * max(0, max_congestion - 0.8) if max_congestion > 0.8 else 0.0

        reward = -(
            self.reward_weights["queue"] * queue_penalty
            + self.reward_weights["wait"] * wait_penalty
            + self.reward_weights["phase_switch"] * phase_penalty
            + emergency_penalty
        ) + flow_bonus
        
        info = {
            "avg_queue": float(np.mean(queue_features) * 40),
            "avg_wait": float(np.mean(wait_features) * 300),
            "max_congestion": float(max_congestion),
            "wait_ns": float(wait_features[0] + wait_features[2]) * 300 / 2 if len(wait_features) >= 4 else float(np.sum(wait_features)),
            "wait_ew": float(wait_features[1] + wait_features[3]) * 300 / 2 if len(wait_features) >= 4 else float(np.sum(wait_features)),
            "phase": self.phases[self.current_phase_index][0],
            "congestion_level": "high" if max_congestion > 0.7 else "medium" if max_congestion > 0.4 else "low",
        }
        return reward, info

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------
    @staticmethod
    def _get_free_port() -> int:
        import socket

        sock = socket.socket()
        sock.bind(("", 0))
        port = sock.getsockname()[1]
        sock.close()
        return port


def make_env(env_kwargs: Dict) -> SumoTrafficEnv:
    """Factory used by stable-baselines."""
    return SumoTrafficEnv(**env_kwargs)

