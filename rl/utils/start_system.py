"""
start_system.py
---------------
Master script to start all components of the adaptive traffic system:
1. Monitoring API server (FastAPI)
2. Optional: Dataset generation from CCTV
3. Optional: Route generation
4. Optional: RL training

Usage:
    python start_system.py [--train] [--dataset] [--routes]
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

def start_monitoring_server(port: int = 8000) -> subprocess.Popen:
    """Start the FastAPI monitoring server."""
    print(f"[INFO] Starting monitoring server on port {port}...")
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api.monitoring_server:app", "--host", "0.0.0.0", "--port", str(port), "--reload"],
        cwd=Path(__file__).parent.parent,
    )

def check_dependencies() -> bool:
    """Check if required dependencies are installed."""
    try:
        import fastapi
        import uvicorn
        import stable_baselines3
        import gymnasium
        import numpy
        import pandas
        import ultralytics
        return True
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("[INFO] Install with: pip install -r requirements.txt")
        return False

def main() -> None:
    parser = argparse.ArgumentParser(description="Start adaptive traffic control system")
    parser.add_argument("--train", action="store_true", help="Start RL training after server")
    parser.add_argument("--sumo-config", default="nets/city.sumocfg", help="SUMO config file")
    parser.add_argument("--route-file", default="routes/city.rou.xml", help="Route file")
    parser.add_argument("--timesteps", type=int, default=200_000, help="Training timesteps")
    parser.add_argument("--port", type=int, default=8000, help="Monitoring API port")
    parser.add_argument("--no-server", action="store_true", help="Don't start monitoring server")
    args = parser.parse_args()

    if not check_dependencies():
        sys.exit(1)

    server_process = None
    if not args.no_server:
        server_process = start_monitoring_server(args.port)
        print(f"[INFO] Monitoring server started. API available at http://localhost:{args.port}/api/metrics")
        print("[INFO] Press Ctrl+C to stop all services")
        time.sleep(2)  # Give server time to start

    if args.train:
        print("[INFO] Starting RL training...")
        train_cmd = [
            sys.executable,
            "core/train_rl.py",
            "--sumo-config", args.sumo_config,
            "--route-file", args.route_file,
            "--timesteps", str(args.timesteps),
            "--log-dir", "artifacts/logs",
            "--model-dir", "models",
        ]
        try:
            subprocess.run(train_cmd, cwd=Path(__file__).parent.parent, check=True)
        except KeyboardInterrupt:
            print("\n[INFO] Training interrupted")
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Training failed: {e}")
    else:
        print("[INFO] System ready. Start training with: python train_rl.py ...")
        print("[INFO] Or restart with --train flag")

    if server_process:
        try:
            server_process.wait()
        except KeyboardInterrupt:
            print("\n[INFO] Shutting down...")
            server_process.terminate()
            server_process.wait()

if __name__ == "__main__":
    main()

