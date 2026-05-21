"""
evaluate.py
Evaluates a trained policy for N episodes and prints aggregate metrics.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, Tuple

import numpy as np
from stable_baselines3 import DQN, PPO

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.data_collector_env import SumoTrafficEnv

ALGO_MAP = {
    "dqn": DQN,
    "ppo": PPO,
}


def evaluate(model_path: str, env_kwargs: Dict, episodes: int = 5, algo: str = "dqn") -> Tuple[list, list]:
    algo_cls = ALGO_MAP[algo.lower()]
    model = algo_cls.load(model_path)
    rewards = []
    avg_queues = []
    for ep in range(episodes):
        env = SumoTrafficEnv(**env_kwargs)
        obs, _ = env.reset()
        done = False
        total_reward = 0.0
        queue_sum = 0.0
        steps = 0
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(int(action))
            done = terminated or truncated
            total_reward += reward
            queue_sum += info.get("avg_queue", 0.0)
            steps += 1
        rewards.append(total_reward)
        avg_queues.append(queue_sum / max(1, steps))
        env.close()
    print(f"Avg reward over {episodes} episodes: {np.mean(rewards):.2f} +/- {np.std(rewards):.2f}")
    print(f"Avg queue per step: {np.mean(avg_queues):.2f}")
    return rewards, avg_queues


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="path to saved model")
    parser.add_argument("--sumo-config", required=True)
    parser.add_argument("--route-file", required=True)
    parser.add_argument("--episodes", type=int, default=5)
    parser.add_argument("--algo", choices=ALGO_MAP.keys(), default="dqn")
    args = parser.parse_args()
    evaluate(
        args.model,
        env_kwargs=dict(sumo_config=args.sumo_config, route_file=args.route_file),
        episodes=args.episodes,
        algo=args.algo,
    )
