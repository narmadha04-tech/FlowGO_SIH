# Adaptive Traffic RL Suite

This folder contains everything required to collect data from CCTV feeds, synthesize SUMO routes, train a Deep Q-Network (DQN) agent, evaluate it, and stream metrics to the monitoring dashboard shipped with the React frontend.

## Pipeline Overview

1. **Dataset generation (`dataset_generator.py`)**
   - Runs YOLOv8 on MP4 files or RTSP URLs and emits `datasets/cctv_counts_*.csv`.
   - Each row includes the timestamp, camera id, vehicle counts, per-class breakdown, and detector confidence.

2. **Route synthesis (`generate_routes.py`)**
   - Consumes the aggregated CSV and creates SUMO-compatible `.rou.xml` files.
   - Vehicle flows are distributed per approach using the camera counts so simulations match real volumes.

3. **Environment (`data_collector_env.py`)**
   - Wraps SUMO/TraCI in a `gymnasium.Env` with queue lengths, waiting times, and live YOLO counts in the observation vector.
   - Rewards penalize long queues, waiting time, and premature phase switches.

4. **Training (`train_rl.py`)**
   - Spins up a `stable-baselines3` DQN agent inside a `DummyVecEnv`.
   - Writes training curves to `artifacts/logs`, checkpoints to `models/`, and publishes a rich monitoring payload to `artifacts/monitoring.json`.

5. **Evaluation (`evaluate.py`)**
   - Loads any supported algorithm (defaults to DQN) and reports mean reward plus queue lengths.

6. **Monitoring API (`monitoring_server.py`)**
   - Lightweight FastAPI server that serves the latest `artifacts/monitoring.json` payload to the frontend (`/api/metrics`).

## Quick Start

```bash
# 1. Create dataset from CCTV footage
python dataset_generator.py --sources data/cctv/*.mp4 --model yolov8n.pt

# 2. Build SUMO routes using aggregated counts
python generate_routes.py \
  --counts datasets/cctv_counts_20250101_120000.csv \
  --output routes/city.rou.xml \
  --edges north=n2i i2s east=e2i i2w south=s2i i2n west=w2i i2e

# 3. Train the DQN agent
python train_rl.py --sumo-config nets/city.sumocfg --route-file routes/city.rou.xml --timesteps 200000

# 4. Evaluate the policy
python evaluate.py --model models/dqn_sumo.zip --sumo-config nets/city.sumocfg --route-file routes/city.rou.xml --episodes 10

# 5. Serve metrics to the dashboard
uvicorn monitoring_server:app --reload --port 8000
```

Make sure `SUMO_HOME` is exported and that `sumo`/`sumo-gui` binaries are on your `PATH`.

