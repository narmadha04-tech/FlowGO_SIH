"""
dataset_generator.py
--------------------
Runs YOLOv8 on CCTV videos or RTSP streams and produces a vehicle count dataset
that can seed the SUMO + DQN pipeline.

Usage:
    python dataset_generator.py --sources data/cctv/*.mp4 --model yolov8n.pt
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Optional

import cv2
import pandas as pd
from ultralytics import YOLO

try:
    from utils.camera_config_loader import get_config_manager
    HAS_CONFIG_LOADER = True
except ImportError:
    HAS_CONFIG_LOADER = False

VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def infer_camera_id(path: Path) -> str:
    match = re.search(r"(cam\d+)", path.stem, re.IGNORECASE)
    return match.group(1).upper() if match else path.stem.upper()


class VehicleDatasetBuilder:
    def __init__(
        self,
        model_path: str,
        conf: float = 0.25,
        frame_stride: int = 5,
        output_dir: Path = Path("datasets"),
    ) -> None:
        self.model = YOLO(model_path)
        self.conf = conf
        self.frame_stride = max(1, frame_stride)
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def process_sources(self, sources: Iterable[str], use_config: bool = False) -> Path:
        records: List[dict] = []
        
        # Try to load camera config if requested
        camera_urls = []
        if use_config and HAS_CONFIG_LOADER:
            try:
                config_mgr = get_config_manager()
                camera_urls = config_mgr.get_all_urls()
                print(f"[INFO] Loaded {len(camera_urls)} cameras from config")
            except Exception as e:
                print(f"[WARN] Could not load camera config: {e}")
        
        # Combine config URLs with provided sources
        all_sources = list(sources) + camera_urls
        
        for source in all_sources:
            # Determine if it's a file path or URL
            path = Path(source) if not source.startswith(("rtsp://", "http://", "https://")) else None
            camera_id = infer_camera_id(path) if path else source.split("/")[-1].split("?")[0]
            
            # Open video source (supports both files and RTSP URLs)
            cap = cv2.VideoCapture(source)
            if not cap.isOpened():
                print(f"[WARN] Unable to open {source}")
                continue
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            frame_idx = 0
            print(f"[INFO] Processing {source} (camera={camera_id})")
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if frame_idx % self.frame_stride != 0:
                    frame_idx += 1
                    continue
                timestamp = datetime.now(timezone.utc)
                
                results = self.model(frame, conf=self.conf, verbose=False)
                detections = results[0]
                vehicles = 0
                confidence_sum = 0.0
                class_counts = {name: 0 for name in VEHICLE_CLASS_IDS.values()}
                for box, cls, conf in zip(detections.boxes.xyxy, detections.boxes.cls, detections.boxes.conf):
                    cls_id = int(cls.item())
                    if cls_id in VEHICLE_CLASS_IDS:
                        vehicles += 1
                        confidence_sum += float(conf.item())
                        class_counts[VEHICLE_CLASS_IDS[cls_id]] += 1
                records.append(
                    {
                        "timestamp": timestamp.isoformat(),
                        "camera_id": camera_id,
                        "frame_index": frame_idx,
                        "vehicles": vehicles,
                        "confidence": confidence_sum / max(1, vehicles),
                        "classes": json.dumps(class_counts),
                        "approach": path.parent.stem.lower() if path.parent.stem else "unknown",
                    }
                )
                frame_idx += 1
            cap.release()

        if not records:
            raise RuntimeError("No detections produced; check sources and model path.")

        df = pd.DataFrame.from_records(records)
        csv_path = self.output_dir / f"cctv_counts_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(csv_path, index=False)
        print(f"[INFO] Saved dataset to {csv_path}")
        return csv_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate vehicle count dataset using YOLOv8.")
    parser.add_argument("--sources", nargs="+", help="Video files or RTSP urls (optional if using --use-config)")
    parser.add_argument("--use-config", action="store_true", help="Load camera URLs from camera_config.json")
    parser.add_argument("--model", default="yolov8n.pt", help="YOLOv8 model path or name")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--stride", type=int, default=5, help="Process every Nth frame")
    parser.add_argument("--output-dir", default="datasets", help="Directory for CSV output")
    args = parser.parse_args()

    if not args.sources and not args.use_config:
        parser.error("Either --sources or --use-config must be provided")

    builder = VehicleDatasetBuilder(
        model_path=args.model,
        conf=args.conf,
        frame_stride=args.stride,
        output_dir=Path(args.output_dir),
    )
    builder.process_sources(args.sources or [], use_config=args.use_config)


if __name__ == "__main__":
    main()


