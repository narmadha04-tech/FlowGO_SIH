"""
generate_routes.py
------------------
Creates SUMO route files based on YOLOv8 vehicle count datasets.

Example:
    python generate_routes.py \\
        --counts datasets/cctv_counts.csv \\
        --output routes/scenario.rou.xml \\
        --edges north=n2i i2s east=e2i i2w south=s2i i2n west=w2i i2e
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


def parse_edges(edge_args: List[str]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for spec in edge_args:
        if "=" not in spec:
            raise ValueError(f"Edge spec '{spec}' is invalid. Expected approach=edge1 edge2")
        key, edges = spec.split("=", 1)
        mapping[key.strip().lower()] = " ".join(part.strip() for part in edges.split())
    return mapping


def aggregate_counts(csv_path: Path, interval: int) -> pd.DataFrame:
    df = pd.read_csv(csv_path, parse_dates=["timestamp"])
    df["bucket"] = (df["timestamp"].astype("int64") // (interval * 1_000_000_000)).astype(int)
    grouped = (
        df.groupby(["approach", "bucket"])
        .agg(
            vehicles=("vehicles", "sum"),
            avg_confidence=("confidence", "mean"),
            samples=("camera_id", "nunique"),
        )
        .reset_index()
    )
    return grouped


def build_route_xml(
    grouped: pd.DataFrame,
    edges: Dict[str, str],
    interval: int,
    output_path: Path,
    base_flow: int,
) -> None:
    header = [
        "<routes>",
        '    <vType id="car" accel="2.0" decel="4.5" sigma="0.5" length="5.0" maxSpeed="20"/>',
        '    <vType id="bus" accel="1.2" decel="4.0" sigma="0.5" length="12.0" maxSpeed="15"/>',
    ]
    flows: List[str] = []
    for _, row in grouped.iterrows():
        approach = row["approach"].lower()
        if approach not in edges:
            continue
        route_edges = edges[approach]
        number = max(1, int(row["vehicles"] + base_flow))
        begin = int(row["bucket"] * interval)
        end = begin + interval
        flow = f'    <flow id="{approach}_{begin}" begin="{begin}" end="{end}" number="{number}" departSpeed="max" type="car" route="{route_edges}"/>'
        flows.append(flow)

    footer = ["</routes>"]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(header + flows + footer), encoding="utf-8")


def save_metadata(grouped: pd.DataFrame, output_path: Path) -> None:
    metadata = (
        grouped.groupby("approach")
        .agg(
            total_vehicles=("vehicles", "sum"),
            avg_confidence=("avg_confidence", "mean"),
            samples=("samples", "sum"),
        )
        .to_dict(orient="index")
    )
    meta_path = output_path.with_suffix(".json")
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate SUMO routes from YOLO counts.")
    parser.add_argument("--counts", required=True, help="CSV created by dataset_generator.py")
    parser.add_argument("--output", required=True, help="Target .rou.xml file")
    parser.add_argument("--edges", nargs="+", required=True, help="Mapping e.g. north=n2i i2s")
    parser.add_argument("--interval", type=int, default=900, help="Flow interval (seconds)")
    parser.add_argument("--base-flow", type=int, default=30, help="Minimum vehicles per interval")
    args = parser.parse_args()

    edges = parse_edges(args.edges)
    grouped = aggregate_counts(Path(args.counts), args.interval)
    build_route_xml(grouped, edges, args.interval, Path(args.output), args.base_flow)
    save_metadata(grouped, Path(args.output))
    print(f"Route file written to {args.output}")


if __name__ == "__main__":
    main()

