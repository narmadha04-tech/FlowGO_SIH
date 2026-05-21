"""
Advanced Incident Detection Engine
Identifies traffic incidents from video analysis with machine learning
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class IncidentSeverity(Enum):
    """Incident severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class IncidentDetection:
    """Detected incident with detailed information"""
    incident_id: str
    incident_type: str
    severity: str
    confidence: float
    frame_index: int
    timestamp: float
    location: Dict[str, float]
    vehicle_count: int
    description: str
    recommended_action: str


class IncidentDetectionEngine:
    """
    Advanced incident detection using behavioral analysis
    """

    # Incident type detection thresholds
    THRESHOLDS = {
        "accident": {
            "congestion_min": 0.75,
            "speed_max": 5,
            "density_min": 2.5,
            "confidence": 0.85,
        },
        "lane_violation": {
            "congestion_min": 0.5,
            "speed_min": 15,
            "density_min": 1.5,
            "confidence": 0.65,
        },
        "illegal_parking": {
            "speed_max": 2,
            "density_min": 2.0,
            "duration_min": 5,
            "confidence": 0.70,
        },
        "speeding": {
            "speed_min": 80,
            "confidence": 0.60,
        },
    }

    def __init__(self):
        """Initialize incident detection engine"""
        self.incident_history: List[IncidentDetection] = []
        self.stationary_vehicles: Dict[int, int] = {}  # vehicle_id -> frames_stationary

    def detect_accident(
        self,
        congestion: float,
        speed: float,
        density: float,
        frame_index: int,
    ) -> Optional[IncidentDetection]:
        """
        Detect potential accident from congestion and speed metrics

        Accidents characterized by:
        - Very high congestion (>75%)
        - Very low speed (<5 km/h)
        - High vehicle density (>2.5/100m²)
        """

        thresholds = self.THRESHOLDS["accident"]

        if (
            congestion >= thresholds["congestion_min"]
            and speed <= thresholds["speed_max"]
            and density >= thresholds["density_min"]
        ):
            severity = (
                IncidentSeverity.CRITICAL
                if congestion > 0.9
                else IncidentSeverity.HIGH
            )

            # Calculate confidence based on how well it matches criteria
            confidence = min(
                (congestion / 0.75)
                * ((5 - speed) / 5)
                * (density / 3),
                1.0,
            )

            return IncidentDetection(
                incident_id=f"ACC_{frame_index}",
                incident_type="accident",
                severity=severity.value,
                confidence=confidence,
                frame_index=frame_index,
                timestamp=frame_index / 30,
                location={"x": 0.5, "y": 0.5},
                vehicle_count=int(density * 100),
                description=f"Traffic accident detected - Congestion: {congestion*100:.1f}%, "
                f"Speed: {speed:.1f} km/h, Density: {density:.1f} vehicles/100m²",
                recommended_action="EMERGENCY_DISPATCH | ROAD_CLOSURE | TRAFFIC_DIVERSION",
            )

        return None

    def detect_lane_violation(
        self,
        congestion: float,
        speed: float,
        density: float,
        frame_index: int,
    ) -> Optional[IncidentDetection]:
        """
        Detect lane violations from traffic behavior

        Lane violations characterized by:
        - Moderate-high congestion (>50%)
        - Medium speed (15-50 km/h)
        - Above-average density (>1.5/100m²)
        """

        thresholds = self.THRESHOLDS["lane_violation"]

        if (
            congestion >= thresholds["congestion_min"]
            and speed >= thresholds["speed_min"]
            and density >= thresholds["density_min"]
        ):
            severity = (
                IncidentSeverity.MEDIUM
                if congestion > 0.65
                else IncidentSeverity.LOW
            )

            confidence = min(
                (congestion / 0.6) * (density / 2),
                1.0,
            )

            return IncidentDetection(
                incident_id=f"LANE_{frame_index}",
                incident_type="lane_violation",
                severity=severity.value,
                confidence=confidence,
                frame_index=frame_index,
                timestamp=frame_index / 30,
                location={"x": 0.5, "y": 0.5},
                vehicle_count=int(density * 100),
                description=f"Lane violation detected - Vehicles crossing lanes detected. "
                f"Congestion: {congestion*100:.1f}%, Speed: {speed:.1f} km/h",
                recommended_action="TRAFFIC_ENFORCEMENT | WARNING_SIGNS",
            )

        return None

    def detect_speeding(
        self,
        speed: float,
        frame_index: int,
        speed_limit: float = 80,
    ) -> Optional[IncidentDetection]:
        """
        Detect speeding vehicles

        Speeding characterized by:
        - Speed significantly above limit
        """

        thresholds = self.THRESHOLDS["speeding"]

        if speed > thresholds["speed_min"]:
            severity = (
                IncidentSeverity.CRITICAL
                if speed > 120
                else IncidentSeverity.HIGH if speed > 100
                else IncidentSeverity.MEDIUM
            )

            confidence = min(speed / 120, 1.0)

            return IncidentDetection(
                incident_id=f"SPD_{frame_index}",
                incident_type="speeding",
                severity=severity.value,
                confidence=confidence,
                frame_index=frame_index,
                timestamp=frame_index / 30,
                location={"x": 0.5, "y": 0.5},
                vehicle_count=1,
                description=f"Speeding detected - Vehicle traveling at {speed:.1f} km/h "
                f"(limit: {speed_limit} km/h)",
                recommended_action="SPEED_CAMERA_ALERT | TRAFFIC_ENFORCEMENT",
            )

        return None

    def detect_illegal_parking(
        self,
        speed: float,
        density: float,
        frame_index: int,
        frames_history: List[Dict],
    ) -> Optional[IncidentDetection]:
        """
        Detect illegal parking from stationary vehicles

        Illegal parking characterized by:
        - Vehicle speed near zero
        - Persistent for multiple frames
        - During active traffic flow
        """

        thresholds = self.THRESHOLDS["illegal_parking"]

        if speed <= thresholds["speed_max"] and density >= thresholds["density_min"]:
            # Check if vehicle has been stationary for multiple frames
            vehicle_id = hash(str((density, frame_index))) % 100
            self.stationary_vehicles[vehicle_id] = (
                self.stationary_vehicles.get(vehicle_id, 0) + 1
            )

            frames_stationary = self.stationary_vehicles[vehicle_id]

            if frames_stationary >= thresholds["duration_min"]:
                severity = (
                    IncidentSeverity.HIGH
                    if frames_stationary > 30
                    else IncidentSeverity.MEDIUM
                )

                confidence = min(
                    frames_stationary / 30,
                    1.0,
                )

                incident = IncidentDetection(
                    incident_id=f"PARK_{frame_index}",
                    incident_type="illegal_parking",
                    severity=severity.value,
                    confidence=confidence,
                    frame_index=frame_index,
                    timestamp=frame_index / 30,
                    location={"x": 0.5, "y": 0.5},
                    vehicle_count=1,
                    description=f"Illegal parking detected - Vehicle stationary for "
                    f"{frames_stationary} frames in active traffic area",
                    recommended_action="PARKING_ENFORCEMENT | TOW_TRUCK",
                )

                # Reset counter after detection
                self.stationary_vehicles[vehicle_id] = 0

                return incident

        return None

    def detect_congestion_spike(
        self,
        congestion_timeline: List[Dict],
        frame_index: int,
    ) -> Optional[IncidentDetection]:
        """
        Detect sudden congestion spikes

        Characterized by:
        - Congestion increase > 30% in short time window
        """

        if len(congestion_timeline) < 10:
            return None

        recent = congestion_timeline[-10:]
        congestion_values = [item["congestion"] for item in recent]

        if not congestion_values:
            return None

        avg_recent = np.mean(congestion_values)
        spike_amount = congestion_values[-1] - avg_recent

        if spike_amount > 0.3:  # 30% increase
            severity = IncidentSeverity.MEDIUM

            return IncidentDetection(
                incident_id=f"SPIKE_{frame_index}",
                incident_type="congestion_spike",
                severity=severity.value,
                confidence=min(spike_amount, 1.0),
                frame_index=frame_index,
                timestamp=frame_index / 30,
                location={"x": 0.5, "y": 0.5},
                vehicle_count=0,
                description=f"Congestion spike detected - Increase of "
                f"{spike_amount*100:.1f}% detected",
                recommended_action="TRAFFIC_MONITORING | INVESTIGATE_CAUSE",
            )

        return None

    def detect_unusual_vehicle_behavior(
        self,
        speed: float,
        acceleration: float,
        frame_index: int,
    ) -> Optional[IncidentDetection]:
        """
        Detect unusual vehicle behavior (sudden stops, erratic movement)

        Characterized by:
        - High acceleration/deceleration
        - Sudden speed changes
        """

        if abs(acceleration) > 5:  # m/s²
            severity = IncidentSeverity.MEDIUM

            return IncidentDetection(
                incident_id=f"BEHAVIOR_{frame_index}",
                incident_type="unusual_behavior",
                severity=severity.value,
                confidence=min(abs(acceleration) / 10, 1.0),
                frame_index=frame_index,
                timestamp=frame_index / 30,
                location={"x": 0.5, "y": 0.5},
                vehicle_count=1,
                description=f"Unusual vehicle behavior - Acceleration: {acceleration:.2f} m/s²",
                recommended_action="TRAFFIC_MONITORING",
            )

        return None

    def filter_incidents(
        self, incidents: List[IncidentDetection], min_confidence: float = 0.60
    ) -> List[IncidentDetection]:
        """Filter incidents by confidence threshold"""
        return [i for i in incidents if i.confidence >= min_confidence]

    def calculate_incident_severity_score(
        self, incident: IncidentDetection
    ) -> int:
        """
        Calculate numerical severity score (0-100)
        """

        severity_scores = {
            "critical": 90,
            "high": 70,
            "medium": 50,
            "low": 30,
        }

        base_score = severity_scores.get(incident.severity, 0)
        confidence_boost = incident.confidence * 10

        return min(int(base_score + confidence_boost), 100)

    def generate_incident_report(
        self, incidents: List[IncidentDetection]
    ) -> Dict:
        """Generate summary report for incidents"""

        by_type = {}
        total_severity = 0

        for incident in incidents:
            incident_type = incident.incident_type
            if incident_type not in by_type:
                by_type[incident_type] = []

            by_type[incident_type].append(incident)
            total_severity += self.calculate_incident_severity_score(incident)

        avg_severity = (
            total_severity / len(incidents) if incidents else 0
        )

        return {
            "total_incidents": len(incidents),
            "by_type": {k: len(v) for k, v in by_type.items()},
            "average_severity": int(avg_severity),
            "critical_incidents": len(
                [i for i in incidents if i.severity == IncidentSeverity.CRITICAL.value]
            ),
            "high_incidents": len(
                [i for i in incidents if i.severity == IncidentSeverity.HIGH.value]
            ),
        }
