"""
FastAPI server that exposes training, evaluation, and live detection metrics to the
React dashboard. It watches the artifacts emitted by dataset generation and RL
training so the UI does not need direct access to SUMO/YOLO processes.
"""

from __future__ import annotations

import base64
import json
import time
from pathlib import Path
from typing import Any, Dict, Optional, List

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials
from ultralytics import YOLO

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.auth_system import (
    UserLogin,
    UserRegister,
    VerificationRequest,
    get_current_user,
    login_user,
    register_user,
    resend_verification_code,
    verify_user_account,
)
from utils.sustainability_metrics import SustainabilityMetricsEngine
from utils.report_generator import ReportGenerator
from utils.congestion_analyzer import CongestionAnalyzer
from utils.incident_detection_engine import IncidentDetectionEngine
from utils.congestion_predictor import CongestionPredictor

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
MONITORING_FILE = ARTIFACTS_DIR / "monitoring.json"
CCTV_SNAPSHOT = ARTIFACTS_DIR / "camera_counts.json"
HEATMAP_DIR = ARTIFACTS_DIR / "logs"
HEATMAP_DIR.mkdir(parents=True, exist_ok=True)
HEATMAP_FILE = HEATMAP_DIR / "heatmap.json"
INCIDENTS_FILE = ARTIFACTS_DIR / "incidents.json"
CONGESTION_FILE = ARTIFACTS_DIR / "congestion.json"
FORECAST_FILE = ARTIFACTS_DIR / "forecast.json"
ECO_METRICS_FILE = ARTIFACTS_DIR / "eco_metrics.json"
REPORTS_FILE = ARTIFACTS_DIR / "reports.json"
EMERGENCY_UNITS_FILE = ARTIFACTS_DIR / "emergency_units.json"

# Initialize engines
SUSTAINABILITY_ENGINE = SustainabilityMetricsEngine()
REPORT_GENERATOR = ReportGenerator(ARTIFACTS_DIR / "reports")
CONGESTION_ANALYZER = CongestionAnalyzer(ARTIFACTS_DIR)
INCIDENT_DETECTOR = IncidentDetectionEngine()
CONGESTION_PREDICTOR = CongestionPredictor()

# YOLO model for live prediction
VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
_yolo_model: Optional[YOLO] = None


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

app = FastAPI(
    title="FlowGo Traffic AI - Monitoring API",
    description="AI-Powered Traffic Management System by FlowGo Team",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_payload() -> Dict[str, Any]:
    """Load monitoring payload from file or return defaults."""
    payload = {}
    if MONITORING_FILE.exists():
        try:
            payload = json.loads(MONITORING_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    
    # Default payload structure
    defaults: Dict[str, Any] = {
        "stats": {
            "active_signals": 28,
            "incidents": 1,
            "green_corridors": 1,
            "avg_response_min": 2.5,
        },
        "recent_events": [
            {"time": "2 min ago", "event": "Green corridor active for ambulance", "type": "success"},
            {"time": "8 min ago", "event": "Signal timing optimized at Junction 12", "type": "info"},
            {"time": "21 min ago", "event": "Minor accident cleared on Route 7", "type": "warning"},
        ],
        "signals": [
            {"id": "SIG-001", "location": "Junction 12", "status": "active", "timing": "60s", "mode": "auto", "queue": 6},
            {"id": "SIG-002", "location": "Main St & Park Ave", "status": "active", "timing": "45s", "mode": "auto", "queue": 4},
            {"id": "SIG-003", "location": "Highway Exit 7", "status": "maintenance", "timing": "-", "mode": "manual", "queue": 0},
        ],
        "traffic": {
            "hourlyVolume": [
                {"hour": "00:00", "volume": 120},
                {"hour": "06:00", "volume": 180},
                {"hour": "09:00", "volume": 420},
                {"hour": "12:00", "volume": 380},
                {"hour": "15:00", "volume": 510},
                {"hour": "18:00", "volume": 560},
            ],
            "weeklyIncidents": [
                {"day": "Mon", "incidents": 12},
                {"day": "Tue", "incidents": 8},
                {"day": "Wed", "incidents": 15},
                {"day": "Thu", "incidents": 10},
                {"day": "Fri", "incidents": 18},
                {"day": "Sat", "incidents": 6},
                {"day": "Sun", "incidents": 4},
            ],
        },
        "corridors": {
            "active": [
                {"id": 1, "type": "Emergency", "route": "City Hospital → Downtown", "eta": "4 min", "mode": "ai"},
                {"id": 2, "type": "VIP", "route": "Airport → Convention Center", "eta": "12 min", "mode": "manual"},
            ]
        },
        "cameras": {
            "feeds": [
                {"id": "CAM-001", "location": "Junction 12", "status": "online"},
                {"id": "CAM-002", "location": "Main Street", "status": "online"},
                {"id": "CAM-003", "location": "Highway Exit 7", "status": "offline"},
            ],
            "online": 2,
            "offline": 1,
            "networkHealth": 0.95,
            "avgResponseMs": 127,
            "alerts": 3,
        },
        "training": {
            "algo": "dqn",
            "avg_wait_ai": 26.4,
            "avg_wait_baseline": 42.0,
            "improvement_pct": 0.37,
            "avg_reward": 180.0,
            "best_reward": 220.0,
        },
        "map": {
            "center": [28.6139, 77.2090],
            "signals": [
                {"id": 1, "position": [28.6139, 77.2090], "status": "green"},
                {"id": 2, "position": [28.6200, 77.2150], "status": "red"},
                {"id": 3, "position": [28.6100, 77.2000], "status": "yellow"},
            ],
            "corridorPath": [
                [28.6139, 77.2090],
                [28.6160, 77.2120],
                [28.6180, 77.2150],
                [28.6200, 77.2180],
            ],
            "vehicles": [
                {"id": 1, "position": [28.6150, 77.2100], "type": "ambulance"},
                {"id": 2, "position": [28.6120, 77.2080], "type": "vip"},
            ],
        },
    }
    
    # Merge defaults into payload for missing keys (deep merge for nested dicts)
    def deep_merge(base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        result = base.copy()
        for key, value in updates.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value)
            elif key not in result:
                result[key] = value
        return result
    
    return deep_merge(defaults, payload)


@app.get("/api/metrics")
async def get_metrics() -> Dict[str, Any]:
    payload = _load_payload()
    payload["updated_at"] = time.time()
    if CCTV_SNAPSHOT.exists():
        try:
            snapshot = json.loads(CCTV_SNAPSHOT.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            snapshot = {}
        camera_section = payload.setdefault("cameras", {"feeds": [], "online": 0, "offline": 0})
        camera_section["live_counts"] = snapshot
    
    # Load heat map data
    if HEATMAP_FILE.exists():
        try:
            heatmap_data = json.loads(HEATMAP_FILE.read_text(encoding="utf-8"))
            payload["heatmap"] = heatmap_data
        except json.JSONDecodeError:
            payload["heatmap"] = {"lanes": []}
    else:
        payload["heatmap"] = {"lanes": []}
    
    # Load emergency vehicles and signals/junctions
    emergency_vehicles = _load_emergency_vehicles()
    signals_junctions = _load_signals_junctions()
    
    # Update map data with emergency vehicles and signals/junctions
    if "map" not in payload:
        payload["map"] = {}
    
    # Add emergency vehicles to map vehicles
    map_vehicles = payload["map"].get("vehicles", [])
    for vehicle in emergency_vehicles:
        if vehicle.get("status") == "active":
            map_vehicles.append({
                "id": vehicle["id"],
                "position": vehicle["current_position"],
                "type": vehicle["vehicle_type"],
            })
    payload["map"]["vehicles"] = map_vehicles
    
    # Update signals with signals/junctions from API
    map_signals = []
    for signal in signals_junctions:
        map_signals.append({
            "id": signal["id"],
            "position": signal["position"],
            "status": signal["status"],
        })
    payload["map"]["signals"] = map_signals
    
    return payload


@app.get("/api/monitoring")
async def get_monitoring() -> Dict[str, Any]:
    """Alias for /api/metrics for backward compatibility."""
    return await get_metrics()


@app.post("/api/metrics")
async def post_metrics(payload: Dict[str, Any]) -> Dict[str, Any]:
    payload["updated_at"] = time.time()
    MONITORING_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {"status": "ok"}


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok", "timestamp": time.time()}


# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/api/auth/register")
async def register(user_data: UserRegister) -> Dict[str, Any]:
    """
    Register a new authority user.
    Returns verification code (in production, send via email/SMS).
    """
    try:
        result = register_user(user_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")


@app.post("/api/auth/login")
async def login(login_data: UserLogin) -> Dict[str, Any]:
    """
    Authenticate user and return JWT token.
    """
    try:
        result = login_user(login_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@app.post("/api/auth/verify")
async def verify(verification_data: VerificationRequest) -> Dict[str, Any]:
    """
    Verify user account with verification code.
    """
    try:
        result = verify_user_account(
            verification_data.authority_id,
            verification_data.verification_code
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


@app.post("/api/auth/resend-verification")
async def resend_verification(authority_id: str) -> Dict[str, Any]:
    """
    Resend verification code to user.
    """
    try:
        result = resend_verification_code(authority_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/auth/me")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get current authenticated user information.
    Requires valid JWT token.
    """
    return {
        "authority_id": current_user["authority_id"],
        "name": current_user["name"],
        "email": current_user.get("email"),
        "role": current_user["role"],
        "is_verified": current_user.get("is_verified", False),
    }


@app.post("/api/auth/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Logout user (client should discard token).
    """
    return {"message": "Logged out successfully"}


@app.post("/api/predict")
async def predict_frame(
    file: UploadFile = File(...),
    # Optional: Require authentication for prediction
    # current_user: Dict[str, Any] = Depends(get_current_user),
    camera_id: str = Form("default"),
    approach: str = Form("unknown"),
    draw_boxes: str = Form("true"),
) -> Dict[str, Any]:
    """
    Process a video frame and return vehicle detection predictions.
    
    Args:
        file: Image file (JPEG, PNG, etc.)
        camera_id: Camera identifier
        approach: Traffic approach direction (north, east, south, west)
        draw_boxes: Whether to return annotated frame with bounding boxes
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
        
        # Update live counts snapshot
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


@app.post("/api/predict-batch")
async def predict_batch(
    files: list[UploadFile] = File(...),
    camera_id: str = Form("default"),
    approach: str = Form("unknown"),
) -> Dict[str, Any]:
    """Process multiple frames in batch."""
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
# EMERGENCY VEHICLE MANAGEMENT ENDPOINTS
# ============================================

EMERGENCY_VEHICLES_FILE = ARTIFACTS_DIR / "emergency_vehicles.json"
SIGNALS_JUNCTIONS_FILE = ARTIFACTS_DIR / "signals_junctions.json"

# Initialize default signals and junctions
DEFAULT_SIGNALS_JUNCTIONS = [
    {"id": 1, "name": "Junction 12", "position": [28.6139, 77.2090], "type": "signal", "status": "green"},
    {"id": 2, "name": "Main St & Park Ave", "position": [28.6200, 77.2150], "type": "signal", "status": "red"},
    {"id": 3, "name": "Highway Exit 7", "position": [28.6100, 77.2000], "type": "junction", "status": "yellow"},
    {"id": 4, "name": "City Center", "position": [28.6160, 77.2120], "type": "signal", "status": "green"},
    {"id": 5, "name": "Airport Road", "position": [28.6180, 77.2150], "type": "junction", "status": "green"},
    {"id": 6, "name": "Hospital Junction", "position": [28.6145, 77.2105], "type": "signal", "status": "red"},
]

def _load_emergency_vehicles() -> list:
    """Load emergency vehicles from file or return empty list."""
    if EMERGENCY_VEHICLES_FILE.exists():
        try:
            return json.loads(EMERGENCY_VEHICLES_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []
    return []

def _save_emergency_vehicles(vehicles: list):
    """Save emergency vehicles to file."""
    EMERGENCY_VEHICLES_FILE.write_text(json.dumps(vehicles, indent=2), encoding="utf-8")

def _load_signals_junctions() -> list:
    """Load signals and junctions from file or return defaults."""
    if SIGNALS_JUNCTIONS_FILE.exists():
        try:
            return json.loads(SIGNALS_JUNCTIONS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    # Initialize with defaults if file doesn't exist
    _save_signals_junctions(DEFAULT_SIGNALS_JUNCTIONS)
    return DEFAULT_SIGNALS_JUNCTIONS

def _save_signals_junctions(signals_junctions: list):
    """Save signals and junctions to file."""
    SIGNALS_JUNCTIONS_FILE.write_text(json.dumps(signals_junctions, indent=2), encoding="utf-8")

@app.get("/api/emergency-vehicles")
async def get_emergency_vehicles() -> Dict[str, Any]:
    """Get all emergency vehicles."""
    vehicles = _load_emergency_vehicles()
    return {"vehicles": vehicles}

@app.post("/api/emergency-vehicles")
async def create_emergency_vehicle(vehicle_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new emergency vehicle route."""
    vehicles = _load_emergency_vehicles()
    
    vehicle_id = len(vehicles) + 1
    new_vehicle = {
        "id": vehicle_id,
        "vehicle_type": vehicle_data.get("vehicle_type", "ambulance"),
        "starting_point": vehicle_data.get("starting_point"),  # [lat, lng]
        "destination": vehicle_data.get("destination"),  # [lat, lng]
        "current_position": vehicle_data.get("starting_point"),  # [lat, lng]
        "route": vehicle_data.get("route", []),  # List of [lat, lng] waypoints
        "signals_on_route": vehicle_data.get("signals_on_route", []),  # List of signal IDs
        "status": "active",
        "created_at": time.time(),
        "updated_at": time.time(),
        "eta": vehicle_data.get("eta", "5 min"),
        "speed": vehicle_data.get("speed", 60),  # km/h
    }
    
    vehicles.append(new_vehicle)
    _save_emergency_vehicles(vehicles)
    
    return {"vehicle": new_vehicle, "message": "Emergency vehicle route created"}

@app.put("/api/emergency-vehicles/{vehicle_id}")
async def update_emergency_vehicle(vehicle_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update emergency vehicle position and status."""
    vehicles = _load_emergency_vehicles()
    
    vehicle = next((v for v in vehicles if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Update position
    if "current_position" in update_data:
        vehicle["current_position"] = update_data["current_position"]
    
    # Update status
    if "status" in update_data:
        vehicle["status"] = update_data["status"]
    
    # Update speed
    if "speed" in update_data:
        vehicle["speed"] = update_data["speed"]
    
    # Update ETA
    if "eta" in update_data:
        vehicle["eta"] = update_data["eta"]
    
    vehicle["updated_at"] = time.time()
    
    _save_emergency_vehicles(vehicles)
    
    return {"vehicle": vehicle, "message": "Vehicle updated"}

@app.delete("/api/emergency-vehicles/{vehicle_id}")
async def delete_emergency_vehicle(vehicle_id: int) -> Dict[str, Any]:
    """Delete an emergency vehicle route."""
    vehicles = _load_emergency_vehicles()
    
    vehicle = next((v for v in vehicles if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicles = [v for v in vehicles if v["id"] != vehicle_id]
    _save_emergency_vehicles(vehicles)
    
    return {"message": "Vehicle route deleted"}

@app.get("/api/signals-junctions")
async def get_signals_junctions() -> Dict[str, Any]:
    """Get all signals and junctions with coordinates."""
    signals_junctions = _load_signals_junctions()
    return {"signals_junctions": signals_junctions}

@app.post("/api/signals-junctions")
async def create_signal_junction(signal_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new signal or junction."""
    signals_junctions = _load_signals_junctions()
    
    signal_id = len(signals_junctions) + 1
    new_signal = {
        "id": signal_id,
        "name": signal_data.get("name", f"Signal {signal_id}"),
        "position": signal_data.get("position"),  # [lat, lng]
        "type": signal_data.get("type", "signal"),  # "signal" or "junction"
        "status": signal_data.get("status", "green"),
    }
    
    signals_junctions.append(new_signal)
    _save_signals_junctions(signals_junctions)
    
    return {"signal_junction": new_signal, "message": "Signal/Junction created"}

@app.put("/api/signals-junctions/{signal_id}")
async def update_signal_junction(signal_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update signal/junction status (for green corridor control)."""
    signals_junctions = _load_signals_junctions()
    
    signal = next((s for s in signals_junctions if s["id"] == signal_id), None)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal/Junction not found")
    
    if "status" in update_data:
        signal["status"] = update_data["status"]
    
    _save_signals_junctions(signals_junctions)
    
    return {"signal_junction": signal, "message": "Signal/Junction updated"}

@app.post("/api/emergency-vehicles/{vehicle_id}/activate-green-corridor")
async def activate_green_corridor(vehicle_id: int) -> Dict[str, Any]:
    """Activate green corridor for emergency vehicle - set all signals on route to green."""
    vehicles = _load_emergency_vehicles()
    signals_junctions = _load_signals_junctions()
    
    vehicle = next((v for v in vehicles if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Set all signals on route to green
    signals_on_route = vehicle.get("signals_on_route", [])
    for signal_id in signals_on_route:
        signal = next((s for s in signals_junctions if s["id"] == signal_id), None)
        if signal:
            signal["status"] = "green"
    
    _save_signals_junctions(signals_junctions)
    
    return {
        "message": "Green corridor activated",
        "signals_updated": len(signals_on_route),
        "vehicle_id": vehicle_id
    }

@app.post("/api/emergency-vehicles/{vehicle_id}/check-passed-signal")
async def check_passed_signal(vehicle_id: int, signal_id: int) -> Dict[str, Any]:
    """Check if vehicle has passed a signal and can turn it back to normal."""
    vehicles = _load_emergency_vehicles()
    signals_junctions = _load_signals_junctions()
    
    vehicle = next((v for v in vehicles if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    signal = next((s for s in signals_junctions if s["id"] == signal_id), None)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    # Simple distance check (in production, use proper geospatial calculations)
    vehicle_pos = vehicle.get("current_position", [])
    signal_pos = signal.get("position", [])
    
    if len(vehicle_pos) == 2 and len(signal_pos) == 2:
        # Calculate distance (simplified - in production use haversine formula)
        lat_diff = abs(vehicle_pos[0] - signal_pos[0])
        lng_diff = abs(vehicle_pos[1] - signal_pos[1])
        distance = (lat_diff ** 2 + lng_diff ** 2) ** 0.5 * 111  # Rough km conversion
        
        # If vehicle is more than 200m past the signal, return to normal
        if distance > 0.2:
            signal["status"] = "red"  # Return to normal cycle
            _save_signals_junctions(signals_junctions)
            return {"passed": True, "message": "Signal returned to normal cycle"}
    
    return {"passed": False, "message": "Vehicle still approaching signal"}


# ============================================
# ADVANCED TRAFFIC INTELLIGENCE ENDPOINTS
# ============================================

# Data storage files
TRAFFIC_LOGS_FILE = ARTIFACTS_DIR / "traffic_logs.json"
ACCIDENTS_FILE = ARTIFACTS_DIR / "accidents.json"
HAZARDS_FILE = ARTIFACTS_DIR / "hazards.json"
VIOLATIONS_FILE = ARTIFACTS_DIR / "violations.json"
WEATHER_DATA_FILE = ARTIFACTS_DIR / "weather_data.json"
SENSOR_DATA_FILE = ARTIFACTS_DIR / "sensor_data.json"
ALERTS_FILE = ARTIFACTS_DIR / "alerts.json"

def _load_json_file(file_path: Path, default: Any = []) -> Any:
    """Load JSON data from file or return default."""
    if file_path.exists():
        try:
            return json.loads(file_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return default
    return default

def _save_json_file(file_path: Path, data: Any):
    """Save JSON data to file."""
    file_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

# Initialize default data
DEFAULT_ACCIDENTS = []
DEFAULT_HAZARDS = [
    {"id": 1, "type": "construction", "location": [28.6139, 77.2090], "severity": "medium", "description": "Road construction on Main St", "start_time": time.time() - 3600, "end_time": time.time() + 7200},
    {"id": 2, "type": "roadblock", "location": [28.6200, 77.2150], "severity": "high", "description": "Temporary roadblock", "start_time": time.time() - 1800, "end_time": time.time() + 3600},
]
DEFAULT_VIOLATIONS = []
DEFAULT_WEATHER = {
    "temperature": 28.5,
    "condition": "clear",
    "humidity": 65,
    "wind_speed": 12,
    "visibility": 10,
    "risk_level": "low"
}

@app.get("/api/traffic/intelligence")
async def get_traffic_intelligence() -> Dict[str, Any]:
    """Get comprehensive traffic intelligence data."""
    accidents = _load_json_file(ACCIDENTS_FILE, DEFAULT_ACCIDENTS)
    hazards = _load_json_file(HAZARDS_FILE, DEFAULT_HAZARDS)
    violations = _load_json_file(VIOLATIONS_FILE, DEFAULT_VIOLATIONS)
    weather = _load_json_file(WEATHER_DATA_FILE, DEFAULT_WEATHER)
    sensor_data = _load_json_file(SENSOR_DATA_FILE, {})
    alerts = _load_json_file(ALERTS_FILE, [])
    
    return {
        "accidents": accidents,
        "hazards": hazards,
        "violations": violations,
        "weather": weather,
        "sensor_data": sensor_data,
        "alerts": alerts,
        "timestamp": time.time()
    }

@app.post("/api/traffic/accidents")
async def report_accident(accident_data: Dict[str, Any]) -> Dict[str, Any]:
    """Report a new accident."""
    accidents = _load_json_file(ACCIDENTS_FILE, DEFAULT_ACCIDENTS)
    
    accident_id = len(accidents) + 1
    new_accident = {
        "id": accident_id,
        "location": accident_data.get("location"),  # [lat, lng]
        "severity": accident_data.get("severity", "medium"),  # low, medium, high, critical
        "type": accident_data.get("type", "collision"),  # collision, breakdown, etc.
        "description": accident_data.get("description", ""),
        "reported_at": time.time(),
        "status": "active",  # active, cleared, false_alarm
        "vehicles_involved": accident_data.get("vehicles_involved", 0),
        "injuries": accident_data.get("injuries", 0),
    }
    
    accidents.append(new_accident)
    _save_json_file(ACCIDENTS_FILE, accidents)
    
    # Create high-priority alert
    alerts = _load_json_file(ALERTS_FILE, [])
    alerts.append({
        "id": len(alerts) + 1,
        "type": "accident",
        "severity": new_accident["severity"],
        "location": new_accident["location"],
        "message": f"Accident reported: {new_accident['description']}",
        "timestamp": time.time(),
        "status": "active"
    })
    _save_json_file(ALERTS_FILE, alerts)
    
    return {"accident": new_accident, "message": "Accident reported"}

@app.post("/api/traffic/hazards")
async def report_hazard(hazard_data: Dict[str, Any]) -> Dict[str, Any]:
    """Report a new hazard (construction, roadblock, weather, etc.)."""
    hazards = _load_json_file(HAZARDS_FILE, DEFAULT_HAZARDS)
    
    hazard_id = len(hazards) + 1
    new_hazard = {
        "id": hazard_id,
        "type": hazard_data.get("type"),  # construction, roadblock, weather, pothole, etc.
        "location": hazard_data.get("location"),  # [lat, lng]
        "severity": hazard_data.get("severity", "medium"),  # low, medium, high
        "description": hazard_data.get("description", ""),
        "start_time": hazard_data.get("start_time", time.time()),
        "end_time": hazard_data.get("end_time", time.time() + 3600),
        "reported_at": time.time(),
        "status": "active"
    }
    
    hazards.append(new_hazard)
    _save_json_file(HAZARDS_FILE, hazards)
    
    return {"hazard": new_hazard, "message": "Hazard reported"}

@app.post("/api/traffic/violations")
async def report_violation(violation_data: Dict[str, Any]) -> Dict[str, Any]:
    """Report a traffic violation (illegal parking, lane switching, etc.)."""
    violations = _load_json_file(VIOLATIONS_FILE, DEFAULT_VIOLATIONS)
    
    violation_id = len(violations) + 1
    new_violation = {
        "id": violation_id,
        "type": violation_data.get("type"),  # illegal_parking, lane_switching, speeding, etc.
        "location": violation_data.get("location"),  # [lat, lng]
        "timestamp": time.time(),
        "vehicle_info": violation_data.get("vehicle_info", {}),
        "description": violation_data.get("description", ""),
        "evidence": violation_data.get("evidence"),  # base64 image or video URL
        "status": "reported"
    }
    
    violations.append(new_violation)
    _save_json_file(VIOLATIONS_FILE, violations)
    
    # Create alert for high-severity violations
    if violation_data.get("type") in ["illegal_parking", "lane_switching"]:
        alerts = _load_json_file(ALERTS_FILE, [])
        alerts.append({
            "id": len(alerts) + 1,
            "type": "violation",
            "severity": "medium",
            "location": new_violation["location"],
            "message": f"{violation_data.get('type', 'Violation')} detected",
            "timestamp": time.time(),
            "status": "active"
        })
        _save_json_file(ALERTS_FILE, alerts)
    
    return {"violation": new_violation, "message": "Violation reported"}

@app.get("/api/traffic/analytics/live")
async def get_live_analytics() -> Dict[str, Any]:
    """Get live traffic analytics (speed, density, wait time, signal delay)."""
    payload = _load_payload()
    
    # Calculate live metrics
    signals = payload.get("signals", [])
    avg_wait_time = sum(int(s.get("timing", "0").replace("s", "")) for s in signals) / max(len(signals), 1)
    total_queue = sum(s.get("queue", 0) for s in signals)
    avg_speed = 45.0  # km/h - would come from GPS/sensor data
    density = total_queue / max(len(signals), 1)
    
    return {
        "speed_flow": {
            "average_speed": avg_speed,
            "free_flow_speed": 60.0,
            "current_flow": avg_speed / 60.0 * 100,  # percentage
        },
        "density": {
            "vehicles_per_km": density * 10,  # approximate
            "queue_length": total_queue,
            "congestion_level": min(100, density * 20),  # percentage
        },
        "wait_time": {
            "average": avg_wait_time,
            "max": max((int(s.get("timing", "0").replace("s", "")) for s in signals), default=0),
            "min": min((int(s.get("timing", "0").replace("s", "")) for s in signals), default=0),
        },
        "signal_delay": {
            "average_delay": avg_wait_time * 0.3,  # seconds
            "total_delay": avg_wait_time * total_queue,
        },
        "timestamp": time.time()
    }

@app.get("/api/traffic/predictions")
async def get_predictions() -> Dict[str, Any]:
    """Get predictive analysis (future congestion, accident likelihood, travel time)."""
    payload = _load_payload()
    current_hour = time.localtime().tm_hour
    
    # Predict future congestion (simplified - in production use ML models)
    future_congestion = []
    base_volume = payload.get("traffic", {}).get("hourlyVolume", [])
    for i in range(6):  # Next 6 hours
        hour = (current_hour + i) % 24
        predicted_volume = 300 + (hour - 8) ** 2 * 10 if 8 <= hour <= 20 else 150
        future_congestion.append({
            "hour": f"{hour:02d}:00",
            "predicted_volume": predicted_volume,
            "congestion_probability": min(100, predicted_volume / 5),
        })
    
    # Accident likelihood (based on current conditions)
    current_incidents = payload.get("stats", {}).get("incidents", 0)
    accident_likelihood = min(100, current_incidents * 15 + 20)
    
    # Travel time estimation
    signals = payload.get("signals", [])
    avg_wait = sum(int(s.get("timing", "0").replace("s", "")) for s in signals) / max(len(signals), 1)
    base_travel_time = 15  # minutes for 10km route
    estimated_travel_time = base_travel_time + (avg_wait / 60) * len(signals)
    
    return {
        "future_congestion": future_congestion,
        "accident_likelihood": {
            "probability": accident_likelihood,
            "risk_level": "high" if accident_likelihood > 70 else "medium" if accident_likelihood > 40 else "low",
            "factors": ["High traffic volume", "Multiple active incidents"] if current_incidents > 2 else ["Normal conditions"],
        },
        "travel_time_estimation": {
            "average": estimated_travel_time,
            "range": [estimated_travel_time * 0.8, estimated_travel_time * 1.3],
            "units": "minutes",
        },
        "timestamp": time.time()
    }

@app.get("/api/traffic/sustainability")
async def get_sustainability_metrics() -> Dict[str, Any]:
    """Get sustainability metrics (fuel wastage, CO₂ emissions, eco-routing)."""
    payload = _load_payload()
    signals = payload.get("signals", [])
    total_queue = sum(s.get("queue", 0) for s in signals)
    avg_wait = sum(int(s.get("timing", "0").replace("s", "")) for s in signals) / max(len(signals), 1)
    
    # Calculate fuel wastage (simplified)
    # Average car idling consumes ~0.5L/hour, assume 50% of queue is idling
    idling_vehicles = total_queue * 0.5
    fuel_wastage_liters = (idling_vehicles * avg_wait / 3600) * 0.5
    
    # CO₂ emissions (1L fuel ≈ 2.3kg CO₂)
    co2_emissions_kg = fuel_wastage_liters * 2.3
    
    # Eco-friendly routing suggestions
    eco_routes = [
        {
            "route_id": 1,
            "from": [28.6139, 77.2090],
            "to": [28.6200, 77.2150],
            "distance": 8.5,  # km
            "estimated_time": 12,  # minutes
            "co2_saved": 1.2,  # kg
            "fuel_saved": 0.5,  # liters
        }
    ]
    
    return {
        "fuel_wastage": {
            "liters_per_hour": fuel_wastage_liters * 3600 / max(avg_wait, 1),
            "total_today": fuel_wastage_liters * 24,
            "cost_estimate": fuel_wastage_liters * 100,  # ₹100 per liter
        },
        "co2_emissions": {
            "kg_per_hour": co2_emissions_kg * 3600 / max(avg_wait, 1),
            "total_today": co2_emissions_kg * 24,
            "equivalent_trees": int(co2_emissions_kg * 24 / 20),  # 1 tree ≈ 20kg CO₂/year
        },
        "eco_routing": {
            "available_routes": eco_routes,
            "potential_savings": {
                "fuel_liters": sum(r["fuel_saved"] for r in eco_routes),
                "co2_kg": sum(r["co2_saved"] for r in eco_routes),
            }
        },
        "timestamp": time.time()
    }

@app.get("/api/traffic/alerts")
async def get_alerts(severity: Optional[str] = None) -> Dict[str, Any]:
    """Get all active alerts, optionally filtered by severity."""
    alerts = _load_json_file(ALERTS_FILE, [])
    
    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity and a.get("status") == "active"]
    else:
        alerts = [a for a in alerts if a.get("status") == "active"]
    
    # Sort by severity and timestamp
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda x: (severity_order.get(x.get("severity", "low"), 3), -x.get("timestamp", 0)))
    
    return {"alerts": alerts, "count": len(alerts), "timestamp": time.time()}

@app.put("/api/traffic/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int) -> Dict[str, Any]:
    """Acknowledge an alert."""
    alerts = _load_json_file(ALERTS_FILE, [])
    
    alert = next((a for a in alerts if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert["status"] = "acknowledged"
    alert["acknowledged_at"] = time.time()
    _save_json_file(ALERTS_FILE, alerts)
    
    return {"alert": alert, "message": "Alert acknowledged"}

@app.post("/api/traffic/detect/lane-switching")
async def detect_lane_switching(detection_data: Dict[str, Any]) -> Dict[str, Any]:
    """Detect and report lane switching violations."""
    violations = _load_json_file(VIOLATIONS_FILE, DEFAULT_VIOLATIONS)
    
    violation_id = len(violations) + 1
    new_violation = {
        "id": violation_id,
        "type": "lane_switching",
        "location": detection_data.get("location"),  # [lat, lng]
        "timestamp": time.time(),
        "vehicle_info": detection_data.get("vehicle_info", {}),
        "description": f"Lane switching violation detected at {detection_data.get('location', [0, 0])}",
        "evidence": detection_data.get("evidence"),  # base64 image or video URL
        "status": "reported",
        "severity": detection_data.get("severity", "medium"),
    }
    
    violations.append(new_violation)
    _save_json_file(VIOLATIONS_FILE, violations)
    
    # Create alert
    alerts = _load_json_file(ALERTS_FILE, [])
    alerts.append({
        "id": len(alerts) + 1,
        "type": "violation",
        "severity": "medium",
        "location": new_violation["location"],
        "message": "Lane switching violation detected",
        "timestamp": time.time(),
        "status": "active"
    })
    _save_json_file(ALERTS_FILE, alerts)
    
    return {"violation": new_violation, "message": "Lane switching violation reported"}

@app.post("/api/traffic/detect/illegal-parking")
async def detect_illegal_parking(detection_data: Dict[str, Any]) -> Dict[str, Any]:
    """Detect and report illegal parking violations."""
    violations = _load_json_file(VIOLATIONS_FILE, DEFAULT_VIOLATIONS)
    
    violation_id = len(violations) + 1
    new_violation = {
        "id": violation_id,
        "type": "illegal_parking",
        "location": detection_data.get("location"),  # [lat, lng]
        "timestamp": time.time(),
        "vehicle_info": detection_data.get("vehicle_info", {}),
        "description": f"Illegal parking detected at {detection_data.get('location', [0, 0])}",
        "evidence": detection_data.get("evidence"),  # base64 image with timestamp
        "status": "reported",
        "severity": detection_data.get("severity", "low"),
        "duration": detection_data.get("duration", 0),  # minutes parked illegally
    }
    
    violations.append(new_violation)
    _save_json_file(VIOLATIONS_FILE, violations)
    
    # Create alert for long-duration parking
    if detection_data.get("duration", 0) > 30:  # More than 30 minutes
        alerts = _load_json_file(ALERTS_FILE, [])
        alerts.append({
            "id": len(alerts) + 1,
            "type": "violation",
            "severity": "medium",
            "location": new_violation["location"],
            "message": f"Illegal parking detected (duration: {detection_data.get('duration', 0)} min)",
            "timestamp": time.time(),
            "status": "active"
        })
        _save_json_file(ALERTS_FILE, alerts)
    
    return {"violation": new_violation, "message": "Illegal parking violation reported"}

@app.get("/api/traffic/congestion/rate")
async def get_congestion_rate() -> Dict[str, Any]:
    """Get current congestion rate with severity levels."""
    payload = _load_payload()
    signals = payload.get("signals", [])
    total_queue = sum(s.get("queue", 0) for s in signals)
    avg_wait = sum(int(s.get("timing", "0").replace("s", "")) for s in signals) / max(len(signals), 1)
    
    # Calculate congestion rate (0-100%)
    congestion_rate = min(100, (total_queue / max(len(signals), 1)) * 10 + (avg_wait / 60) * 20)
    
    # Determine severity
    if congestion_rate >= 80:
        severity = "critical"
        color = "red"
    elif congestion_rate >= 60:
        severity = "high"
        color = "orange"
    elif congestion_rate >= 40:
        severity = "medium"
        color = "yellow"
    else:
        severity = "low"
        color = "green"
    
    return {
        "rate": round(congestion_rate, 1),
        "severity": severity,
        "color": color,
        "queue_length": total_queue,
        "average_wait": avg_wait,
        "timestamp": time.time()
    }


@app.post("/api/emergency-vehicles/{vehicle_id}/simulate-movement")
async def simulate_vehicle_movement(vehicle_id: int) -> Dict[str, Any]:
    """Simulate vehicle movement along its route in real-time."""
    vehicles = _load_emergency_vehicles()
    
    vehicle = next((v for v in vehicles if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    if vehicle.get("status") != "active":
        return {"vehicle": vehicle, "message": "Vehicle is not active"}
    
    route = vehicle.get("route", [])
    if not route or len(route) < 2:
        return {"vehicle": vehicle, "message": "No route defined"}
    
    # Get current position
    current_pos = vehicle.get("current_position", vehicle.get("starting_point"))
    destination = vehicle.get("destination")
    
    # Find closest point on route to current position
    route_index = 0
    min_distance = float('inf')
    for i, point in enumerate(route):
        lat_diff = abs(current_pos[0] - point[0])
        lng_diff = abs(current_pos[1] - point[1])
        distance = (lat_diff ** 2 + lng_diff ** 2) ** 0.5
        if distance < min_distance:
            min_distance = distance
            route_index = i
    
    # Move vehicle along route (simulate movement)
    speed_kmh = vehicle.get("speed", 60)
    # Convert speed to degrees per update (rough approximation)
    # 60 km/h ≈ 0.00015 degrees per second (at equator)
    movement_per_second = (speed_kmh / 60.0) * 0.00015
    
    # Move to next point on route
    if route_index < len(route) - 1:
        next_point = route[route_index + 1]
        # Interpolate between current and next point
        lat_diff = next_point[0] - current_pos[0]
        lng_diff = next_point[1] - current_pos[1]
        distance = (lat_diff ** 2 + lng_diff ** 2) ** 0.5
        
        if distance > movement_per_second:
            # Move towards next point
            ratio = movement_per_second / distance
            new_lat = current_pos[0] + (lat_diff * ratio)
            new_lng = current_pos[1] + (lng_diff * ratio)
            vehicle["current_position"] = [new_lat, new_lng]
        else:
            # Reached next point, move to it
            vehicle["current_position"] = next_point
    
    # Check if reached destination
    if destination:
        lat_diff = abs(vehicle["current_position"][0] - destination[0])
        lng_diff = abs(vehicle["current_position"][1] - destination[1])
        distance = (lat_diff ** 2 + lng_diff ** 2) ** 0.5
        
        if distance < 0.001:  # Very close to destination
            vehicle["current_position"] = destination
            vehicle["status"] = "completed"
    
    vehicle["updated_at"] = time.time()
    _save_emergency_vehicles(vehicles)
    
    return {"vehicle": vehicle, "message": "Vehicle position updated"}


@app.post("/api/emergency-vehicles/simulate-all")
async def simulate_all_vehicles() -> Dict[str, Any]:
    """Simulate movement for all active vehicles."""
    vehicles = _load_emergency_vehicles()
    active_vehicles = [v for v in vehicles if v.get("status") == "active"]
    
    updated = []
    for vehicle in active_vehicles:
        try:
            result = await simulate_vehicle_movement(vehicle["id"])
            updated.append(result["vehicle"])
        except Exception as e:
            print(f"Error simulating vehicle {vehicle['id']}: {e}")
    
    return {"vehicles": updated, "count": len(updated)}


# ======================================================
# CITY-LEVEL REAL-TIME TRAFFIC & PREDICTIVE API STUBS
# ======================================================


def _load_or_default(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return default
    return default


@app.get("/api/congestion/now")
async def api_congestion_now(area: Optional[str] = None, corridor: Optional[str] = None) -> Dict[str, Any]:
    """Return current congestion metrics for area/corridor/link."""
    payload = _load_or_default(CONGESTION_FILE, {
        "area": area or "city-core",
        "corridor": corridor or "ring-road",
        "congestion_index": 0.62,
        "avg_speed_kph": 32,
        "vehicle_density_vpkm": 48,
        "avg_wait_s": 38,
        "queue_len_m": 120,
        "timestamp": time.time(),
        "baseline_congestion_index": 0.72,
        "reduction_pct": 13.9,
    })
    payload["timestamp"] = time.time()
    return payload


@app.get("/api/congestion/forecast")
async def api_congestion_forecast(area: Optional[str] = None, horizon: int = 60) -> Dict[str, Any]:
    """Return congestion forecast for the next horizons (15/30/60)."""
    forecast = _load_or_default(FORECAST_FILE, {
        "area": area or "city-core",
        "horizons": [
            {"minutes": 15, "congestion_index": 0.58, "confidence": 0.82},
            {"minutes": 30, "congestion_index": 0.61, "confidence": 0.8},
            {"minutes": 60, "congestion_index": 0.65, "confidence": 0.77},
        ],
        "hotspots": [
            {"link_id": "L-101", "risk": 0.78},
            {"link_id": "L-207", "risk": 0.72},
        ],
        "timestamp": time.time(),
    })
    forecast["timestamp"] = time.time()
    return forecast


@app.get("/api/incidents")
async def api_incidents(since: Optional[float] = None, incident_type: Optional[str] = None) -> Dict[str, Any]:
    """Return accidents/hazards/parking/lane incidents."""
    incidents = _load_or_default(INCIDENTS_FILE, [
        {"id": 1, "type": "accident", "severity": "high", "location": [28.615, 77.21], "timestamp": time.time() - 120, "status": "active"},
        {"id": 2, "type": "lane", "severity": "medium", "location": [28.617, 77.213], "timestamp": time.time() - 300, "status": "active"},
        {"id": 3, "type": "parking", "severity": "low", "location": [28.612, 77.205], "timestamp": time.time() - 900, "status": "active"},
        {"id": 4, "type": "obstruction", "severity": "high", "location": [28.619, 77.218], "timestamp": time.time() - 60, "status": "active"},
    ])
    if incident_type:
        incidents = [i for i in incidents if i.get("type") == incident_type]
    if since:
        incidents = [i for i in incidents if i.get("timestamp", 0) >= since]
    return {"incidents": incidents, "count": len(incidents), "timestamp": time.time()}


@app.get("/api/violations/lane")
async def api_lane_violations() -> Dict[str, Any]:
    violations = [i for i in _load_or_default(VIOLATIONS_FILE, DEFAULT_VIOLATIONS) if i.get("type") == "lane_switching"]
    return {"violations": violations, "count": len(violations), "timestamp": time.time()}


@app.get("/api/violations/parking")
async def api_parking_violations() -> Dict[str, Any]:
    violations = [i for i in _load_or_default(VIOLATIONS_FILE, DEFAULT_VIOLATIONS) if i.get("type") == "illegal_parking"]
    return {"violations": violations, "count": len(violations), "timestamp": time.time()}


@app.get("/api/eco/routes")
async def api_eco_routes(origin: str, dest: str) -> Dict[str, Any]:
    """Return eco-friendly routing suggestions with CO₂/fuel estimates."""
    routes = [
        {"route_id": "eco-1", "eta_min": 14, "distance_km": 8.4, "co2_kg": 1.8, "fuel_l": 0.7, "polyline": []},
        {"route_id": "fast-1", "eta_min": 12, "distance_km": 8.0, "co2_kg": 2.1, "fuel_l": 0.9, "polyline": []},
    ]
    return {
        "origin": origin,
        "destination": dest,
        "routes": routes,
        "timestamp": time.time(),
    }


@app.get("/api/eco/metrics")
async def api_eco_metrics(area: Optional[str] = None) -> Dict[str, Any]:
    metrics = _load_or_default(ECO_METRICS_FILE, {
        "area": area or "city-core",
        "idle_fuel_waste_lph": 42.0,
        "co2_kgph": 96.0,
        "co2_per_trip_kg": 1.4,
        "potential_savings_pct": 12.5,
        "timestamp": time.time(),
    })
    metrics["timestamp"] = time.time()
    return metrics


@app.get("/api/emergency/units")
async def api_emergency_units() -> Dict[str, Any]:
    units = _load_or_default(EMERGENCY_UNITS_FILE, [
        {"unit_id": "AMB-21", "lat": 28.616, "lon": 77.212, "heading": 90, "siren": True, "requested_corridor": "corridor-1"},
        {"unit_id": "FIRE-4", "lat": 28.61, "lon": 77.204, "heading": 45, "siren": False, "requested_corridor": None},
    ])
    return {"units": units, "timestamp": time.time()}


@app.get("/api/emergency/preemption")
async def api_emergency_preemption() -> Dict[str, Any]:
    return {
        "active": True,
        "corridor_id": "corridor-1",
        "intersections": [
            {"id": "SIG-001", "status": "preempt_green"},
            {"id": "SIG-002", "status": "preempt_yellow"},
        ],
        "timestamp": time.time(),
    }


@app.get("/api/reports")
async def api_reports(report_type: str = "impact") -> Dict[str, Any]:
    reports = _load_or_default(REPORTS_FILE, [
        {"id": "rpt-impact-latest", "type": "impact", "url": "/reports/impact-latest.pdf", "generated_at": time.time()},
        {"id": "rpt-violations-week", "type": "violations", "url": "/reports/violations-week.csv", "generated_at": time.time()},
    ])
    filtered = [r for r in reports if r.get("type") == report_type] if report_type else reports
    return {"reports": filtered, "timestamp": time.time()}


@app.get("/api/predictive/accident-likelihood")
async def api_accident_likelihood(area: Optional[str] = None) -> Dict[str, Any]:
    return {
        "area": area or "city-core",
        "likelihood": 0.18,
        "top_links": [
            {"link_id": "L-101", "risk": 0.31},
            {"link_id": "L-207", "risk": 0.27},
        ],
        "timestamp": time.time(),
    }


@app.get("/api/predictive/eta")
async def api_eta(origin: str, dest: str) -> Dict[str, Any]:
    return {
        "origin": origin,
        "destination": dest,
        "eta_min": 16,
        "p90_eta_min": 22,
        "p10_eta_min": 12,
        "timestamp": time.time(),
    }


@app.get("/api/signals/{signal_id}/action")
async def api_signal_action(signal_id: str) -> Dict[str, Any]:
    """DQN interface stub for next action proposal."""
    return {
        "signal_id": signal_id,
        "action": "extend_phase",
        "phase": "NS_green",
        "confidence": 0.78,
        "timestamp": time.time(),
    }


# ============================================
# SUSTAINABILITY METRICS ENDPOINTS
# ============================================

@app.get("/api/traffic/sustainability")
async def get_sustainability_metrics() -> Dict[str, Any]:
    """Get current sustainability metrics."""
    try:
        eco_data = _load_json_file(ECO_METRICS_FILE, {})
        
        if not eco_data:
            # Generate sample data
            vehicles_data = [
                {"type": "car", "distance_km": 15.2, "speed_kmh": 45, "wait_time_sec": 240},
                {"type": "truck", "distance_km": 22.0, "speed_kmh": 50, "wait_time_sec": 180},
                {"type": "bus", "distance_km": 18.5, "speed_kmh": 40, "wait_time_sec": 300},
                {"type": "car", "distance_km": 12.3, "speed_kmh": 48, "wait_time_sec": 200},
            ]
            eco_data = SUSTAINABILITY_ENGINE.calculate_network_sustainability(vehicles_data)
            _save_json_file(ECO_METRICS_FILE, eco_data)
        
        return {
            "metrics": eco_data,
            "timestamp": time.time(),
            "recommendations": [
                "Implement eco-routing to reduce fuel consumption",
                "Optimize signal timings to reduce idling vehicles",
                "Promote public transportation during peak hours",
                "Encourage carpooling initiatives",
            ],
        }
    except Exception as e:
        return {
            "error": str(e),
            "metrics": {},
            "timestamp": time.time(),
        }


@app.post("/api/traffic/eco-routes")
async def suggest_eco_routes(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    vehicle_type: str = "car"
) -> Dict[str, Any]:
    """Suggest eco-friendly routes."""
    try:
        origin = (origin_lat, origin_lng)
        destination = (dest_lat, dest_lng)
        
        # Get current traffic data
        payload = _load_payload()
        traffic_data = {
            "congestion": payload.get("traffic", {}).get("hourlyVolume", [])
        }
        
        routes = SUSTAINABILITY_ENGINE.suggest_eco_routes(
            origin,
            destination,
            traffic_data,
            vehicle_type
        )
        
        return {
            "routes": routes,
            "best_route": routes[0] if routes else None,
            "timestamp": time.time(),
        }
    except Exception as e:
        return {
            "error": str(e),
            "routes": [],
            "timestamp": time.time(),
        }


@app.get("/api/traffic/sustainability/report")
async def get_sustainability_report(period: str = "daily") -> Dict[str, Any]:
    """Get sustainability report for specified period."""
    try:
        daily_report = SUSTAINABILITY_ENGINE.get_daily_report()
        
        return {
            "period": period,
            "report": daily_report,
            "total_records": len(SUSTAINABILITY_ENGINE.metrics_history),
            "timestamp": time.time(),
        }
    except Exception as e:
        return {
            "error": str(e),
            "timestamp": time.time(),
        }


# ============================================
# REPORT GENERATION ENDPOINTS
# ============================================

@app.post("/api/reports/generate")
async def generate_report(
    report_type: str,
    period: str = "daily",
    format: str = "pdf"
) -> Dict[str, Any]:
    """
    Generate traffic report.
    
    Args:
        report_type: 'daily', 'weekly', 'monthly', 'sustainability', 'incident'
        period: 'daily', 'weekly', 'monthly'
        format: 'pdf', 'csv'
    """
    try:
        if report_type == "sustainability":
            eco_data = _load_json_file(ECO_METRICS_FILE, {})
            filepath = REPORT_GENERATOR.generate_sustainability_report(
                period=period,
                sustainability_data=eco_data,
                format=format
            )
        elif report_type == "daily":
            payload = _load_payload()
            traffic_data = {
                "total_vehicles": sum(s.get("queue", 0) for s in payload.get("signals", [])) * 10,
                "avg_speed": 45.0,
                "peak_time": "08:00-09:00",
                "congestion_level": "medium",
                "hourly_metrics": [
                    {
                        "hour": f"{h:02d}:00",
                        "vehicle_count": 200 + (50 * (h % 12)),
                        "avg_speed": 42 + (h % 5),
                        "congestion": 45 + (h % 30),
                    }
                    for h in range(24)
                ],
                "recommendations": [
                    "Monitor peak hours closely",
                    "Increase signal optimization during 8-10 AM",
                ],
            }
            
            incidents = _load_json_file(INCIDENTS_FILE, [])
            filepath = REPORT_GENERATOR.generate_daily_traffic_report(
                date_str=datetime.now().strftime("%Y-%m-%d"),
                traffic_data=traffic_data,
                incidents=incidents,
                format=format
            )
        else:
            raise ValueError(f"Unknown report type: {report_type}")
        
        # Record report
        reports = _load_json_file(REPORTS_FILE, [])
        reports.append({
            "id": f"rpt-{report_type}-{int(time.time())}",
            "type": report_type,
            "format": format,
            "filepath": str(filepath),
            "generated_at": datetime.now().isoformat(),
        })
        _save_json_file(REPORTS_FILE, reports[-10:])  # Keep last 10
        
        return {
            "status": "generated",
            "report_type": report_type,
            "format": format,
            "filepath": str(filepath),
            "download_url": f"/api/reports/download/{filepath.name}",
            "timestamp": time.time(),
        }
    except Exception as e:
        return {
            "error": str(e),
            "timestamp": time.time(),
        }


@app.get("/api/reports/download/{filename}")
async def download_report(filename: str) -> Dict[str, Any]:
    """Get report file download link."""
    filepath = ARTIFACTS_DIR / "reports" / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "filename": filename,
        "filepath": str(filepath),
        "size_bytes": filepath.stat().st_size,
        "created_at": filepath.stat().st_ctime,
    }


@app.get("/api/reports/list")
async def list_reports(report_type: str = None) -> Dict[str, Any]:
    """List generated reports."""
    reports = _load_json_file(REPORTS_FILE, [])
    
    if report_type:
        reports = [r for r in reports if r.get("type") == report_type]
    
    return {
        "total": len(reports),
        "reports": reports,
        "timestamp": time.time(),
    }


# ============================================
# IMPORT DATETIME FOR REPORTS
# ============================================
from datetime import datetime


# ============================================
# VIDEO CONGESTION ANALYSIS ENDPOINTS
# ============================================

# Store video analysis sessions
VIDEO_SESSIONS: Dict[str, Dict[str, Any]] = {}
VIDEOS_DIR = ARTIFACTS_DIR / "videos"
VIDEOS_DIR.mkdir(exist_ok=True)


@app.post("/api/video/upload")
async def upload_video(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload traffic video for congestion analysis."""
    
    video_id = f"video_{int(time.time())}"
    video_path = VIDEOS_DIR / f"{video_id}.mp4"
    
    # Save uploaded file
    try:
        contents = await file.read()
        with open(video_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")
    
    # Get video duration using opencv
    cap = cv2.VideoCapture(str(video_path))
    if cap.isOpened():
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / max(fps, 1)
        cap.release()
    else:
        duration = 0
    
    # Initialize analysis session
    VIDEO_SESSIONS[video_id] = {
        "filename": file.filename,
        "video_path": str(video_path),
        "upload_time": time.time(),
        "status": "pending",
        "progress": 0,
        "duration_seconds": duration,
        "results": None,
        "error": None,
    }
    
    # Start background analysis (in production, use Celery/Queue)
    _start_video_analysis(video_id)
    
    return {
        "video_id": video_id,
        "filename": file.filename,
        "duration": duration,
        "message": "Video uploaded successfully. Analysis starting...",
    }


def _start_video_analysis(video_id: str):
    """Start video analysis in background."""
    
    import threading
    
    def analyze():
        try:
            session = VIDEO_SESSIONS.get(video_id)
            if not session:
                return
            
            session["status"] = "processing"
            session["progress"] = 10
            
            # Analyze video
            metrics = CONGESTION_ANALYZER.analyze_video(
                session["video_path"],
                road_type="urban",
                sample_rate=5,
            )
            
            session["progress"] = 50
            
            # Detect incidents
            incidents = []
            for item in metrics.congestion_timeline:
                if len(incidents) < metrics.total_incidents:
                    incident = INCIDENT_DETECTOR.detect_accident(
                        item["congestion"],
                        30,  # estimated speed
                        metrics.avg_vehicle_density,
                        item["frame"],
                    )
                    if incident:
                        incidents.append(incident)
            
            session["progress"] = 70
            
            # Predict future congestion
            forecasts = CONGESTION_PREDICTOR.predict_congestion(
                metrics.congestion_timeline,
                time_horizons=[15, 30, 60],
            )
            
            session["progress"] = 90
            
            # Save results
            results = {
                "video_id": metrics.video_id,
                "filename": metrics.filename,
                "congestion_rate": metrics.congestion_rate,
                "avg_vehicle_density": metrics.avg_vehicle_density,
                "avg_speed_kmh": metrics.avg_speed_kmh,
                "total_incidents": metrics.total_incidents,
                "predicted_congestion": metrics.predicted_congestion,
                "incidents": metrics.incidents,
                "congestion_timeline": metrics.congestion_timeline,
                "density_timeline": metrics.density_timeline,
                "speed_timeline": metrics.speed_timeline,
                "forecasts": [
                    {
                        "time_horizon_minutes": f.time_horizon_minutes,
                        "predicted_congestion": f.predicted_congestion,
                        "risk_level": f.risk_level,
                        "trend": f.trend,
                    }
                    for f in forecasts
                ],
            }
            
            session["results"] = results
            session["status"] = "completed"
            session["progress"] = 100
            
            # Save to file
            analysis_file = ARTIFACTS_DIR / f"video_analysis_{video_id}.json"
            with open(analysis_file, "w") as f:
                json.dump(results, f, indent=2)
            
        except Exception as e:
            session["status"] = "failed"
            session["error"] = str(e)
            import traceback
            traceback.print_exc()
    
    # Run in background thread
    thread = threading.Thread(target=analyze, daemon=True)
    thread.start()


@app.get("/api/video/analysis/{video_id}")
async def get_video_analysis(video_id: str) -> Dict[str, Any]:
    """Get video analysis status and results."""
    
    session = VIDEO_SESSIONS.get(video_id)
    if not session:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {
        "video_id": video_id,
        "status": session["status"],
        "progress": session["progress"],
        "results": session.get("results"),
        "error": session.get("error"),
    }


@app.get("/api/video/list")
async def list_videos() -> Dict[str, Any]:
    """List all uploaded videos."""
    
    videos = []
    for video_id, session in VIDEO_SESSIONS.items():
        videos.append({
            "video_id": video_id,
            "filename": session["filename"],
            "duration_seconds": session["duration_seconds"],
            "status": session["status"],
            "progress": session["progress"],
            "upload_time": session["upload_time"],
            "has_results": session["results"] is not None,
        })
    
    return {
        "total": len(videos),
        "videos": videos,
    }


@app.get("/api/video/{video_id}/export")
async def export_video_report(video_id: str, format: str = "pdf") -> Dict[str, Any]:
    """Export video analysis report."""
    
    session = VIDEO_SESSIONS.get(video_id)
    if not session or session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Video analysis not completed")
    
    results = session["results"]
    
    # Generate report based on format
    if format == "pdf":
        report_content = _generate_video_pdf_report(results)
    else:
        report_content = _generate_video_csv_report(results)
    
    report_filename = f"video_analysis_{video_id}.{format}"
    report_path = ARTIFACTS_DIR / report_filename
    
    with open(report_path, "w" if format == "csv" else "wb") as f:
        if isinstance(report_content, str):
            f.write(report_content.encode() if format == "csv" else report_content)
        else:
            f.write(report_content)
    
    return {
        "filename": report_filename,
        "filepath": str(report_path),
        "format": format,
        "download_url": f"/api/video/{video_id}/download?format={format}",
    }


@app.get("/api/video/{video_id}/download")
async def download_video_report(video_id: str, format: str = "pdf"):
    """Download video analysis report."""
    
    from fastapi.responses import FileResponse
    
    report_filename = f"video_analysis_{video_id}.{format}"
    report_path = ARTIFACTS_DIR / report_filename
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    return FileResponse(
        path=report_path,
        media_type="application/octet-stream",
        filename=report_filename,
    )


def _generate_video_pdf_report(results: Dict[str, Any]) -> bytes:
    """Generate PDF report for video analysis."""
    
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from io import BytesIO
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
        )
        elements.append(Paragraph("Video Congestion Analysis Report", title_style))
        elements.append(Spacer(1, 0.3*inch))
        
        # Metrics Table
        metrics_data = [
            ["Metric", "Value"],
            ["Congestion Rate", f"{results['congestion_rate']:.1f}%"],
            ["Vehicle Density", f"{results['avg_vehicle_density']:.1f} vehicles/100m²"],
            ["Average Speed", f"{results['avg_speed_kmh']:.1f} km/h"],
            ["Incidents Detected", str(results['total_incidents'])],
            ["Predicted Congestion", f"{results['predicted_congestion']:.1f}%"],
        ]
        
        metrics_table = Table(metrics_data)
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        elements.append(metrics_table)
        elements.append(Spacer(1, 0.5*inch))
        
        # Build PDF
        doc.build(elements)
        return buffer.getvalue()
    
    except ImportError:
        # Fallback: return CSV
        return _generate_video_csv_report(results).encode()


def _generate_video_csv_report(results: Dict[str, Any]) -> str:
    """Generate CSV report for video analysis."""
    
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Video Congestion Analysis Report"])
    writer.writerow([])
    
    # Metrics
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Congestion Rate (%)", results['congestion_rate']])
    writer.writerow(["Vehicle Density (vehicles/100m²)", results['avg_vehicle_density']])
    writer.writerow(["Average Speed (km/h)", results['avg_speed_kmh']])
    writer.writerow(["Incidents Detected", results['total_incidents']])
    writer.writerow(["Predicted Congestion (%)", results['predicted_congestion']])
    writer.writerow([])
    
    # Incidents
    if results.get('incidents'):
        writer.writerow(["Incident Type", "Timestamp", "Confidence", "Description"])
        for incident in results['incidents']:
            writer.writerow([
                incident['type'],
                f"{incident['timestamp']:.1f}s",
                f"{incident['confidence']*100:.0f}%",
                incident['description'],
            ])
    
    return output.getvalue()



