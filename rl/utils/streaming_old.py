"""
streaming_old.py
----------------
OLD/ORIGINAL Streaming Implementation with Live Streaming Option
This is the original standalone streaming code for vehicle detection.

Features:
- Standalone processing functions
- Optional live RTSP/HTTP streaming support
- Simple frame processing
- Can be used as separate module or server
"""

from __future__ import annotations

import base64
import json
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

# Initialize YOLO model
MODEL_PATH = Path(__file__).parent / "yolov8n.pt"
model: Optional[YOLO] = None

VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Live streaming state
_active_streams: Dict[str, threading.Thread] = {}
_stream_callbacks: Dict[str, Callable] = {}


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
    """
    OLD IMPLEMENTATION: Process a single video frame with YOLOv8.
    
    This is the original standalone function for processing frames.
    
    Args:
        frame_bytes: Raw image bytes
        draw_boxes: Whether to draw bounding boxes on frame
    
    Returns:
        Dictionary with detection results
    """
    # Decode image
    nparr = np.frombuffer(frame_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        raise ValueError("Invalid image data")
    
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


# ============================================
# LIVE STREAMING OPTION (Optional Feature)
# ============================================

def start_live_stream(
    stream_url: str,
    camera_id: str = "default",
    approach: str = "unknown",
    frame_callback: Optional[Callable] = None,
    fps: int = 2,
    draw_boxes: bool = True,
) -> bool:
    """
    OPTIONAL: Start live streaming from RTSP/HTTP source.
    
    This is an optional feature that can be added to the old implementation.
    
    Args:
        stream_url: RTSP or HTTP stream URL (e.g., "rtsp://ip:port/stream")
        camera_id: Camera identifier
        approach: Traffic approach direction
        frame_callback: Optional callback function for each processed frame
        fps: Frames per second to process (default: 2)
        draw_boxes: Whether to draw bounding boxes
    
    Returns:
        True if stream started successfully
    """
    if camera_id in _active_streams:
        print(f"[WARN] Stream for {camera_id} already running")
        return False
    
    def stream_worker():
        """Worker thread for processing stream."""
        cap = cv2.VideoCapture(stream_url)
        if not cap.isOpened():
            print(f"[ERROR] Failed to open stream: {stream_url}")
            _active_streams.pop(camera_id, None)
            return
        
        print(f"[INFO] Started live stream: {camera_id} from {stream_url}")
        frame_interval = 1.0 / fps
        last_time = time.time()
        
        try:
            while camera_id in _active_streams:
                ret, frame = cap.read()
                if not ret:
                    print(f"[WARN] Failed to read frame from {camera_id}")
                    time.sleep(1)
                    continue
                
                # Throttle to desired FPS
                current_time = time.time()
                if current_time - last_time < frame_interval:
                    continue
                last_time = current_time
                
                # Encode frame to bytes
                _, buffer = cv2.imencode('.jpg', frame)
                frame_bytes = buffer.tobytes()
                
                # Process frame using old implementation
                try:
                    result = process_frame(frame_bytes, draw_boxes=draw_boxes)
                    result["camera_id"] = camera_id
                    result["approach"] = approach
                    result["timestamp"] = time.time()
                    
                    # Call callback if provided
                    if frame_callback:
                        frame_callback(result)
                    
                    # Store in stream callbacks dict
                    if camera_id in _stream_callbacks:
                        _stream_callbacks[camera_id](result)
                        
                except Exception as e:
                    print(f"[ERROR] Processing frame from {camera_id}: {e}")
                
        except Exception as e:
            print(f"[ERROR] Stream worker error for {camera_id}: {e}")
        finally:
            cap.release()
            _active_streams.pop(camera_id, None)
            print(f"[INFO] Stopped live stream: {camera_id}")
    
    thread = threading.Thread(target=stream_worker, daemon=True)
    thread.start()
    _active_streams[camera_id] = thread
    
    return True


def stop_live_stream(camera_id: str) -> bool:
    """
    OPTIONAL: Stop a live stream.
    
    Args:
        camera_id: Camera identifier to stop
    
    Returns:
        True if stream was stopped
    """
    if camera_id in _active_streams:
        _active_streams.pop(camera_id, None)
        _stream_callbacks.pop(camera_id, None)
        print(f"[INFO] Stopping stream: {camera_id}")
        return True
    return False


def register_stream_callback(camera_id: str, callback: Callable) -> None:
    """
    OPTIONAL: Register a callback for stream results.
    
    Args:
        camera_id: Camera identifier
        callback: Function to call with detection results
    """
    _stream_callbacks[camera_id] = callback


def get_active_streams() -> List[str]:
    """Get list of active stream camera IDs."""
    return list(_active_streams.keys())


# ============================================
# STANDALONE SERVER (Optional)
# ============================================
# Uncomment below to run this as a standalone server with live streaming option

app_old = FastAPI(title="Old Streaming API (Standalone)")
app_old.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app_old.post("/api/predict-old")
async def predict_frame_old(
    file: UploadFile = File(...),
    camera_id: str = "default",
    approach: str = "unknown",
    draw_boxes: bool = True,
) -> Dict[str, Any]:
    """
    OLD ENDPOINT: Process a video frame using old implementation.
    
    This endpoint uses the original standalone processing function.
    """
    try:
        contents = await file.read()
        result = process_frame(contents, draw_boxes=draw_boxes)
        
        return {
            "camera_id": camera_id,
            "approach": approach,
            "timestamp": time.time(),
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app_old.post("/api/stream/start")
async def start_stream_endpoint(
    stream_url: str,
    camera_id: str = "default",
    approach: str = "unknown",
    fps: int = 2,
    draw_boxes: bool = True,
) -> Dict[str, Any]:
    """
    OPTIONAL: Start live streaming endpoint.
    
    This is an optional feature - add live streaming capability.
    """
    success = start_live_stream(
        stream_url=stream_url,
        camera_id=camera_id,
        approach=approach,
        fps=fps,
        draw_boxes=draw_boxes,
    )
    
    return {
        "status": "started" if success else "failed",
        "camera_id": camera_id,
        "stream_url": stream_url,
    }


@app_old.post("/api/stream/stop")
async def stop_stream_endpoint(camera_id: str) -> Dict[str, Any]:
    """OPTIONAL: Stop live streaming endpoint."""
    success = stop_live_stream(camera_id)
    return {
        "status": "stopped" if success else "not_found",
        "camera_id": camera_id,
    }


@app_old.get("/api/stream/active")
async def get_active_streams_endpoint() -> Dict[str, Any]:
    """OPTIONAL: Get list of active streams."""
    return {
        "active_streams": get_active_streams(),
        "count": len(_active_streams),
    }


@app_old.websocket("/api/stream/ws/{camera_id}")
async def stream_websocket(websocket: WebSocket, camera_id: str):
    """
    OPTIONAL: WebSocket endpoint for real-time stream results.
    
    Connect to this endpoint to receive live detection results.
    """
    await websocket.accept()
    
    def send_result(result: Dict[str, Any]):
        """Callback to send results via WebSocket."""
        try:
            websocket.send_json(result)
        except:
            pass
    
    register_stream_callback(camera_id, send_result)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        stop_live_stream(camera_id)
        print(f"[INFO] WebSocket disconnected for {camera_id}")


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("Old Streaming API Server")
    print("=" * 50)
    print("Endpoints:")
    print("  POST /api/predict-old - Process single frame")
    print("  POST /api/stream/start - Start live stream (OPTIONAL)")
    print("  POST /api/stream/stop - Stop live stream (OPTIONAL)")
    print("  GET  /api/stream/active - List active streams (OPTIONAL)")
    print("  WS   /api/stream/ws/{camera_id} - WebSocket stream (OPTIONAL)")
    print("=" * 50)
    uvicorn.run(app_old, host="0.0.0.0", port=8001)
