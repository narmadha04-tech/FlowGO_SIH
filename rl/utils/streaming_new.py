"""
streaming_new.py
----------------
NEW/CURRENT Streaming Implementation
This is the current integrated streaming code used in monitoring_server.py.

This file extracts the new implementation for reference.
The actual endpoints are integrated into monitoring_server.py.

Features:
- Integrated with monitoring server
- Automatic camera counts update
- Form data support
- Batch processing
"""

from __future__ import annotations

import base64
import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

# YOLO model for live prediction
VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
_yolo_model: Optional[YOLO] = None

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
CCTV_SNAPSHOT = ARTIFACTS_DIR / "camera_counts.json"


def get_yolo_model() -> YOLO:
    """Lazy load YOLO model for predictions."""
    global _yolo_model
    if _yolo_model is None:
        model_path = Path(__file__).parent / "yolov8n.pt"
        if model_path.exists():
            _yolo_model = YOLO(str(model_path))
        else:
            _yolo_model = YOLO("yolov8n.pt")
    return _yolo_model


async def predict_frame_new(
    file: UploadFile = File(...),
    camera_id: str = Form("default"),
    approach: str = Form("unknown"),
    draw_boxes: str = Form("true"),
) -> Dict[str, Any]:
    """
    NEW IMPLEMENTATION: Process a video frame and return vehicle detection predictions.
    
    This is the current integrated version used in monitoring_server.py.
    It includes automatic camera counts update and better error handling.
    
    Args:
        file: Image file (JPEG, PNG, etc.)
        camera_id: Camera identifier
        approach: Traffic approach direction (north, east, south, west)
        draw_boxes: Whether to return annotated frame with bounding boxes
    
    Returns:
        Dictionary with detection results and metadata
    """
    try:
        # Read image bytes
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Run YOLO detection
        model = get_yolo_model()
        results = model(frame, conf=0.25, verbose=False)
        detections = results[0]
        
        # Extract vehicle detections
        vehicle_detections = []
        class_counts = {name: 0 for name in VEHICLE_CLASS_IDS.values()}
        confidence_sum = 0.0
        
        draw_boxes_bool = draw_boxes.lower() == "true" if isinstance(draw_boxes, str) else draw_boxes
        annotated_frame = frame.copy() if draw_boxes_bool else None
        
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
                
                # Draw bounding box
                if draw_boxes_bool and annotated_frame is not None:
                    x1, y1, x2, y2 = [int(x) for x in bbox]
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    label = f"{class_name} {confidence:.2f}"
                    cv2.putText(annotated_frame, label, (x1, y1 - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Encode annotated frame
        frame_encoded = None
        if draw_boxes_bool and annotated_frame is not None:
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frame_encoded = base64.b64encode(buffer).decode('utf-8')
        
        # NEW FEATURE: Update live counts snapshot
        snapshot = {
            approach: len(vehicle_detections),
            "timestamp": time.time(),
            "camera_id": camera_id,
        }
        CCTV_SNAPSHOT.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
        
        return {
            "camera_id": camera_id,
            "approach": approach,
            "timestamp": time.time(),
            "total_vehicles": len(vehicle_detections),
            "detections": vehicle_detections,
            "class_counts": class_counts,
            "avg_confidence": confidence_sum / max(1, len(vehicle_detections)),
            "frame_encoded": frame_encoded,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


async def predict_batch_new(
    files: list[UploadFile] = File(...),
    camera_id: str = Form("default"),
    approach: str = Form("unknown"),
) -> Dict[str, Any]:
    """
    NEW IMPLEMENTATION: Process multiple frames in batch.
    
    This is the current batch processing implementation.
    """
    results = []
    for file in files:
        try:
            # Process each file directly
            contents = await file.read()
            nparr = np.frombuffer(contents, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                results.append({"error": "Invalid image data", "filename": file.filename or "unknown"})
                continue
            
            # Run YOLO detection
            model = get_yolo_model()
            yolo_results = model(frame, conf=0.25, verbose=False)
            detections = yolo_results[0]
            
            # Extract vehicle detections
            vehicle_detections = []
            class_counts = {name: 0 for name in VEHICLE_CLASS_IDS.values()}
            confidence_sum = 0.0
            
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
            
            results.append({
                "filename": file.filename or "unknown",
                "camera_id": camera_id,
                "approach": approach,
                "timestamp": time.time(),
                "total_vehicles": len(vehicle_detections),
                "detections": vehicle_detections,
                "class_counts": class_counts,
                "avg_confidence": confidence_sum / max(1, len(vehicle_detections)),
            })
        except Exception as e:
            results.append({"error": str(e), "filename": file.filename or "unknown"})
    return {"results": results, "total": len(results)}


# ============================================
# USAGE IN monitoring_server.py
# ============================================
# The functions above are integrated into monitoring_server.py as:
# - @app.post("/api/predict") -> uses predict_frame_new
# - @app.post("/api/predict-batch") -> uses predict_batch_new

