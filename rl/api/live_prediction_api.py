"""
live_prediction_api.py
---------------------
API endpoint for real-time video prediction using YOLOv8.
Processes uploaded video frames or streams and returns vehicle detection results.
"""

from __future__ import annotations

import base64
import io
import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

# Initialize YOLO model
MODEL_PATH = Path(__file__).parent / "yolov8n.pt"
model: Optional[YOLO] = None

VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def get_model() -> YOLO:
    """Lazy load YOLO model."""
    global model
    if model is None:
        if MODEL_PATH.exists():
            model = YOLO(str(MODEL_PATH))
        else:
            model = YOLO("yolov8n.pt")  # Download if not found
    return model


class PredictionRequest(BaseModel):
    """Request model for video frame prediction."""
    camera_id: Optional[str] = "default"
    approach: Optional[str] = "unknown"


class DetectionResult(BaseModel):
    """Single vehicle detection result."""
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]


class PredictionResponse(BaseModel):
    """Response model for predictions."""
    camera_id: str
    timestamp: float
    total_vehicles: int
    detections: List[DetectionResult]
    class_counts: Dict[str, int]
    avg_confidence: float
    frame_encoded: Optional[str] = None  # Base64 encoded annotated frame


def process_frame(frame_bytes: bytes, draw_boxes: bool = True) -> Dict[str, Any]:
    """Process a single video frame with YOLOv8."""
    # Decode image
    nparr = np.frombuffer(frame_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data")
    
    # Run YOLO detection
    yolo_model = get_model()
    results = yolo_model(frame, conf=0.25, verbose=False)
    detections = results[0]
    
    # Extract vehicle detections
    vehicle_detections = []
    class_counts = {name: 0 for name in VEHICLE_CLASS_IDS.values()}
    confidence_sum = 0.0
    
    annotated_frame = frame.copy() if draw_boxes else None
    
    for box, cls, conf in zip(detections.boxes.xyxy, detections.boxes.cls, detections.boxes.conf):
        cls_id = int(cls.item())
        if cls_id in VEHICLE_CLASS_IDS:
            class_name = VEHICLE_CLASS_IDS[cls_id]
            confidence = float(conf.item())
            bbox = [float(x) for x in box.tolist()]
            
            vehicle_detections.append({
                "class_name": class_name,
                "confidence": confidence,
                "bbox": bbox,
            })
            
            class_counts[class_name] += 1
            confidence_sum += confidence
            
            # Draw bounding box on annotated frame
            if draw_boxes and annotated_frame is not None:
                x1, y1, x2, y2 = [int(x) for x in bbox]
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"{class_name} {confidence:.2f}"
                cv2.putText(annotated_frame, label, (x1, y1 - 10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    # Encode annotated frame if requested
    frame_encoded = None
    if draw_boxes and annotated_frame is not None:
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_encoded = base64.b64encode(buffer).decode('utf-8')
    
    return {
        "total_vehicles": len(vehicle_detections),
        "detections": vehicle_detections,
        "class_counts": class_counts,
        "avg_confidence": confidence_sum / max(1, len(vehicle_detections)),
        "frame_encoded": frame_encoded,
    }


# Add endpoints to existing monitoring server
# This will be imported and added to monitoring_server.py

