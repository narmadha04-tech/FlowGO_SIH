"""
Video-based Congestion Analysis Engine
Detects incidents, calculates congestion metrics, and predicts future traffic patterns
"""

import cv2
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import json
import logging
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class IncidentType(Enum):
    """Types of traffic incidents"""
    ACCIDENT = "accident"
    LANE_VIOLATION = "lane_violation"
    ILLEGAL_PARKING = "illegal_parking"
    SPEEDING = "speeding"


@dataclass
class Incident:
    """Traffic incident data structure"""
    id: str
    type: str
    timestamp: float
    frame_index: int
    confidence: float
    location: Dict[str, float]
    description: str


@dataclass
class CongestionMetrics:
    """Congestion analysis metrics"""
    video_id: str
    filename: str
    congestion_rate: float
    avg_vehicle_density: float
    avg_speed_kmh: float
    total_incidents: int
    predicted_congestion: float
    incidents: List[Dict]
    congestion_timeline: List[Dict]
    density_timeline: List[Dict]
    speed_timeline: List[Dict]


class CongestionAnalyzer:
    """
    Video-based congestion analyzer using computer vision
    """

    # Vehicle detection confidence threshold
    DETECTION_CONFIDENCE = 0.5

    # Congestion threshold for target ~12% baseline
    CONGESTION_THRESHOLD = 0.12

    # Vehicle types for classification
    VEHICLE_CLASSES = ["car", "truck", "bus", "motorcycle", "bicycle", "pedestrian"]

    # Typical speeds by road type (km/h)
    TYPICAL_SPEEDS = {
        "urban": 40,
        "highway": 100,
        "residential": 30,
    }

    def __init__(self, artifacts_dir: Optional[Path] = None):
        """Initialize congestion analyzer"""
        self.artifacts_dir = artifacts_dir or Path("./artifacts")
        self.artifacts_dir.mkdir(exist_ok=True)

    def analyze_video(
        self,
        video_path: str,
        road_type: str = "urban",
        sample_rate: int = 5,  # Analyze every Nth frame
    ) -> CongestionMetrics:
        """
        Analyze traffic video for congestion and incidents

        Args:
            video_path: Path to video file
            road_type: Type of road (urban/highway/residential)
            sample_rate: Frame sampling rate for analysis

        Returns:
            CongestionMetrics object with analysis results
        """

        logger.info(f"Starting video analysis: {video_path}")

        video = cv2.VideoCapture(video_path)
        if not video.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        # Video properties
        total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = video.get(cv2.CAP_PROP_FPS)
        frame_width = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))

        logger.info(
            f"Video: {total_frames} frames @ {fps}fps, {frame_width}x{frame_height}"
        )

        # Analysis results
        frame_count = 0
        total_congestion = 0
        total_density = 0
        total_speed = 0
        incidents: List[Incident] = []

        # Timeline data
        congestion_timeline = []
        density_timeline = []
        speed_timeline = []

        # Analyze frames
        frame_index = 0
        while True:
            ret, frame = video.read()
            if not ret:
                break

            # Process every Nth frame
            if frame_index % sample_rate == 0:
                frame_metrics = self._analyze_frame(
                    frame, frame_index, fps, road_type
                )

                congestion = frame_metrics["congestion"]
                density = frame_metrics["density"]
                speed = frame_metrics["speed"]

                total_congestion += congestion
                total_density += density
                total_speed += speed
                frame_count += 1

                # Record timeline
                congestion_timeline.append(
                    {"frame": frame_index, "congestion": congestion}
                )
                density_timeline.append(
                    {"frame": frame_index, "density": density}
                )
                speed_timeline.append(
                    {"frame": frame_index, "speed": speed}
                )

                # Detect incidents
                frame_incidents = self._detect_incidents(
                    frame, frame_index, congestion, density, speed
                )
                incidents.extend(frame_incidents)

            frame_index += 1

        video.release()

        # Calculate averages
        avg_congestion = (total_congestion / frame_count) if frame_count > 0 else 0
        avg_density = (total_density / frame_count) if frame_count > 0 else 0
        avg_speed = (total_speed / frame_count) if frame_count > 0 else 0

        # Predict future congestion
        predicted_congestion = self._predict_congestion(
            congestion_timeline, avg_congestion
        )

        # Convert incidents to dicts
        incidents_list = [
            {
                "id": f"INC_{i}",
                "type": incident.type,
                "timestamp": incident.timestamp,
                "frame_index": incident.frame_index,
                "confidence": float(incident.confidence),
                "location": incident.location,
                "description": incident.description,
            }
            for i, incident in enumerate(incidents)
        ]

        # Create metrics object
        metrics = CongestionMetrics(
            video_id=Path(video_path).stem,
            filename=Path(video_path).name,
            congestion_rate=float(avg_congestion * 100),
            avg_vehicle_density=float(avg_density),
            avg_speed_kmh=float(avg_speed),
            total_incidents=len(incidents),
            predicted_congestion=float(predicted_congestion * 100),
            incidents=incidents_list,
            congestion_timeline=congestion_timeline,
            density_timeline=density_timeline,
            speed_timeline=speed_timeline,
        )

        logger.info(f"Analysis complete: {avg_congestion*100:.1f}% congestion")

        return metrics

    def _analyze_frame(
        self,
        frame: np.ndarray,
        frame_index: int,
        fps: float,
        road_type: str,
    ) -> Dict[str, float]:
        """
        Analyze single frame for congestion metrics

        Returns:
            Dictionary with congestion, density, and speed metrics
        """

        # Detect vehicles in frame
        vehicles = self._detect_vehicles(frame)

        # Calculate congestion (proportion of frame occupied)
        frame_area = frame.shape[0] * frame.shape[1]
        occupied_area = sum(
            (v["bbox"][2] - v["bbox"][0]) * (v["bbox"][3] - v["bbox"][1])
            for v in vehicles
        )
        congestion = min(occupied_area / frame_area, 1.0)

        # Calculate vehicle density (vehicles per standard area)
        density = len(vehicles) / max(frame_area / 10000, 1)  # Per 100x100 area

        # Estimate speed from optical flow
        typical_speed = self.TYPICAL_SPEEDS.get(road_type, 40)
        speed = self._estimate_speed_from_flow(frame, typical_speed)

        return {
            "congestion": congestion,
            "density": density,
            "speed": speed,
        }

    def _detect_vehicles(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect vehicles in frame using edge detection and contours

        Returns:
            List of detected vehicles with bounding boxes
        """

        vehicles = []

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)

        # Find contours
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        # Filter and classify contours as vehicles
        for contour in contours:
            area = cv2.contourArea(contour)

            # Vehicle size thresholds (in pixels)
            if area < 50 or area > 50000:
                continue

            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = w / h if h > 0 else 0

            # Vehicle-like aspect ratio (typically 1-4)
            if aspect_ratio < 0.5 or aspect_ratio > 5:
                continue

            vehicles.append(
                {
                    "bbox": [x, y, x + w, y + h],
                    "area": area,
                    "aspect_ratio": aspect_ratio,
                    "confidence": 0.7,  # Moderate confidence
                }
            )

        return vehicles

    def _estimate_speed_from_flow(
        self, frame: np.ndarray, typical_speed: float
    ) -> float:
        """
        Estimate average vehicle speed from optical flow

        Returns:
            Estimated speed in km/h
        """

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Lukas-Kanade optical flow (simplified)
        # In real implementation, would compare with previous frame
        # For now, return typical speed scaled by activity
        corners = cv2.goodFeaturesToTrack(
            gray, maxCorners=100, qualityLevel=0.3, minDistance=7
        )

        if corners is None:
            return typical_speed * 0.5

        # Use corner activity as proxy for motion
        motion_intensity = len(corners) / max(gray.shape[0] * gray.shape[1] / 10000, 1)

        # Scale typical speed based on motion
        # High motion = traffic flowing well = higher speed
        estimated_speed = typical_speed * (0.3 + 0.7 * min(motion_intensity / 20, 1))

        return max(estimated_speed, 5)  # Minimum 5 km/h

    def _detect_incidents(
        self,
        frame: np.ndarray,
        frame_index: int,
        congestion: float,
        density: float,
        speed: float,
    ) -> List[Incident]:
        """
        Detect traffic incidents in frame

        Returns:
            List of detected incidents
        """

        incidents = []
        timestamp = frame_index / 30  # Assume 30fps

        # Detect accidents (extreme congestion + immobility)
        if congestion > 0.8 and speed < 5:
            incidents.append(
                Incident(
                    id=f"ACC_{frame_index}",
                    type=IncidentType.ACCIDENT.value,
                    timestamp=timestamp,
                    frame_index=frame_index,
                    confidence=0.75,
                    location={"x": 0.5, "y": 0.5},
                    description="Potential accident detected (high congestion + immobility)",
                )
            )

        # Detect speeding (vehicles moving too fast)
        if speed > 80:
            incidents.append(
                Incident(
                    id=f"SPD_{frame_index}",
                    type=IncidentType.SPEEDING.value,
                    timestamp=timestamp,
                    frame_index=frame_index,
                    confidence=0.60,
                    location={"x": 0.5, "y": 0.5},
                    description="Speeding detected (>80 km/h)",
                )
            )

        # Detect lane violations (vehicles in unusual positions)
        if congestion > 0.6 and density > 3:
            incidents.append(
                Incident(
                    id=f"LANE_{frame_index}",
                    type=IncidentType.LANE_VIOLATION.value,
                    timestamp=timestamp,
                    frame_index=frame_index,
                    confidence=0.65,
                    location={"x": 0.5, "y": 0.5},
                    description="Lane violation detected (unusual vehicle positioning)",
                )
            )

        # Detect illegal parking (stationary vehicles in traffic flow)
        if congestion > 0.4 and speed < 3 and density > 2:
            incidents.append(
                Incident(
                    id=f"PARK_{frame_index}",
                    type=IncidentType.ILLEGAL_PARKING.value,
                    timestamp=timestamp,
                    frame_index=frame_index,
                    confidence=0.70,
                    location={"x": 0.5, "y": 0.5},
                    description="Illegal parking detected (stationary vehicle in traffic)",
                )
            )

        return incidents

    def _predict_congestion(
        self, timeline: List[Dict], current_avg: float
    ) -> float:
        """
        Predict future congestion based on trend analysis

        Returns:
            Predicted congestion rate (0-1)
        """

        if len(timeline) < 2:
            return current_avg

        # Extract values
        values = [item["congestion"] for item in timeline]

        # Calculate trend (simple linear regression)
        x = np.arange(len(values))
        y = np.array(values)

        # Fit polynomial (degree 2 for peak/valley detection)
        if len(x) > 2:
            coeffs = np.polyfit(x, y, 2)
            poly = np.poly1d(coeffs)

            # Predict at 1.5x current position
            future_position = len(x) * 1.5
            predicted = poly(future_position)
        else:
            predicted = current_avg

        # Clamp to valid range
        return max(0, min(predicted, 1.0))

    def save_results(self, metrics: CongestionMetrics, output_path: Optional[Path] = None) -> Path:
        """Save analysis results to JSON"""

        if output_path is None:
            output_path = self.artifacts_dir / f"video_{metrics.video_id}.json"

        with open(output_path, "w") as f:
            json.dump(asdict(metrics), f, indent=2)

        logger.info(f"Results saved to {output_path}")
        return output_path

    def generate_heatmap(self, metrics: CongestionMetrics) -> np.ndarray:
        """
        Generate heatmap visualization from congestion timeline

        Returns:
            Heatmap image as numpy array
        """

        # Create blank heatmap
        heatmap_width = 800
        heatmap_height = 600

        heatmap = np.zeros((heatmap_height, heatmap_width, 3), dtype=np.uint8)

        if not metrics.congestion_timeline:
            return heatmap

        # Normalize timeline data
        congestions = [item["congestion"] for item in metrics.congestion_timeline]
        max_congestion = max(congestions) if congestions else 1

        # Draw gradient from left to right
        for i, congestion in enumerate(congestions):
            x = int(i / len(congestions) * heatmap_width)
            normalized = congestion / max_congestion

            # Color gradient: green -> yellow -> red
            if normalized < 0.33:
                color = (0, int(255 * (normalized / 0.33)), 0)  # Green
            elif normalized < 0.66:
                color = (0, 255, int(255 * ((normalized - 0.33) / 0.33)))  # Yellow
            else:
                color = (0, int(255 * (1 - (normalized - 0.66) / 0.34)), 255)  # Red

            cv2.line(heatmap, (x, 0), (x, heatmap_height), color, 2)

        return heatmap
