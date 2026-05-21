"""
Congestion Prediction Model
Predicts future traffic patterns based on video analysis
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class CongestionForecast:
    """Congestion forecast for future time periods"""
    time_horizon_minutes: int
    predicted_congestion: float
    confidence_interval: Tuple[float, float]
    risk_level: str
    trend: str  # "increasing", "decreasing", "stable"


class CongestionPredictor:
    """
    Machine learning-based congestion predictor
    Uses historical data to forecast future traffic patterns
    """

    # Seasonal patterns (hour of day: congestion multiplier)
    HOURLY_MULTIPLIERS = {
        7: 1.4,  # Morning rush
        8: 1.8,  # Peak morning
        9: 1.5,
        12: 1.2,  # Lunch time
        17: 1.9,  # Evening rush start
        18: 1.8,  # Peak evening
        19: 1.5,
        20: 0.9,
    }

    # Weekly patterns (day: multiplier)
    WEEKLY_MULTIPLIERS = {
        0: 1.1,  # Monday
        1: 1.0,  # Tuesday
        2: 1.0,  # Wednesday
        3: 0.9,  # Thursday
        4: 1.1,  # Friday
        5: 0.7,  # Saturday
        6: 0.6,  # Sunday
    }

    def __init__(self, window_size: int = 30):
        """
        Initialize predictor

        Args:
            window_size: Number of historical frames to use for prediction
        """
        self.window_size = window_size
        self.historical_data: List[Dict] = []

    def add_observation(self, congestion: float, density: float, speed: float):
        """Add observation to historical data"""
        self.historical_data.append(
            {"congestion": congestion, "density": density, "speed": speed}
        )

        # Keep only recent history
        if len(self.historical_data) > self.window_size * 10:
            self.historical_data = self.historical_data[-self.window_size * 10 :]

    def predict_congestion(
        self,
        congestion_timeline: List[Dict],
        time_horizons: Optional[List[int]] = None,
    ) -> List[CongestionForecast]:
        """
        Predict congestion for multiple time horizons

        Args:
            congestion_timeline: Historical congestion values
            time_horizons: Prediction horizons in minutes (default: [15, 30, 60])

        Returns:
            List of forecasts for each time horizon
        """

        if time_horizons is None:
            time_horizons = [15, 30, 60]

        forecasts = []

        for horizon in time_horizons:
            forecast = self._predict_single_horizon(
                congestion_timeline, horizon
            )
            forecasts.append(forecast)

        return forecasts

    def _predict_single_horizon(
        self, congestion_timeline: List[Dict], minutes_ahead: int
    ) -> CongestionForecast:
        """Predict congestion for single time horizon"""

        if not congestion_timeline:
            return CongestionForecast(
                time_horizon_minutes=minutes_ahead,
                predicted_congestion=0.5,
                confidence_interval=(0.3, 0.7),
                risk_level="unknown",
                trend="stable",
            )

        # Extract values
        values = np.array(
            [item["congestion"] for item in congestion_timeline]
        )

        # Calculate trend components
        trend = self._calculate_trend(values)
        seasonality = self._estimate_seasonality(minutes_ahead)
        mean_congestion = np.mean(values)

        # Combine components
        predicted = mean_congestion + trend + seasonality

        # Clamp to valid range
        predicted = max(0, min(predicted, 1.0))

        # Estimate confidence interval
        std_dev = np.std(values) if len(values) > 1 else 0.1
        margin = 1.96 * std_dev  # 95% confidence
        ci_lower = max(0, predicted - margin)
        ci_upper = min(1.0, predicted + margin)

        # Determine risk level
        if predicted > 0.7:
            risk_level = "critical"
        elif predicted > 0.5:
            risk_level = "high"
        elif predicted > 0.3:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Determine trend
        if trend > 0.1:
            trend_label = "increasing"
        elif trend < -0.1:
            trend_label = "decreasing"
        else:
            trend_label = "stable"

        return CongestionForecast(
            time_horizon_minutes=minutes_ahead,
            predicted_congestion=float(predicted),
            confidence_interval=(float(ci_lower), float(ci_upper)),
            risk_level=risk_level,
            trend=trend_label,
        )

    def _calculate_trend(self, values: np.ndarray) -> float:
        """
        Calculate trend using linear regression

        Returns:
            Trend component (positive=increasing, negative=decreasing)
        """

        if len(values) < 2:
            return 0

        # Simple linear fit
        x = np.arange(len(values))
        coeffs = np.polyfit(x, values, 1)

        # Normalize by length to make comparable across different sequences
        slope = coeffs[0]
        return slope / len(values)

    def _estimate_seasonality(self, minutes_ahead: int) -> float:
        """
        Estimate seasonal effect (time of day, day of week)

        Returns:
            Seasonality component (-0.3 to +0.3)
        """

        # For demo, use fixed seasonal pattern
        # In production, would use actual historical patterns

        # More congestion during peak hours
        hour = (minutes_ahead // 60) % 24

        hourly_effect = 0
        if hour in [7, 8, 9, 17, 18, 19]:  # Rush hours
            hourly_effect = 0.2
        elif hour in [22, 23, 0, 1, 2, 3, 4, 5, 6]:  # Night
            hourly_effect = -0.3

        return hourly_effect

    def predict_incident_probability(
        self, congestion_timeline: List[Dict]
    ) -> Dict[str, float]:
        """
        Predict probability of incidents based on congestion patterns

        Returns:
            Dictionary with incident type probabilities
        """

        if not congestion_timeline:
            return {
                "accident": 0.1,
                "lane_violation": 0.15,
                "illegal_parking": 0.05,
                "speeding": 0.2,
            }

        values = np.array(
            [item["congestion"] for item in congestion_timeline]
        )
        mean_congestion = np.mean(values)
        congestion_volatility = np.std(values)

        # Probabilities increase with congestion
        accident_prob = min(mean_congestion * 1.5, 1.0)
        lane_violation_prob = min(mean_congestion * 1.2, 1.0)
        illegal_parking_prob = min(mean_congestion * 0.8, 1.0)

        # Speeding more likely when not congested
        speeding_prob = min((1 - mean_congestion) * 0.5, 1.0)

        # Volatility increases all incident probabilities
        volatility_boost = min(congestion_volatility * 0.3, 0.2)

        return {
            "accident": min(accident_prob + volatility_boost, 1.0),
            "lane_violation": min(lane_violation_prob + volatility_boost, 1.0),
            "illegal_parking": min(illegal_parking_prob + volatility_boost, 1.0),
            "speeding": min(speeding_prob + volatility_boost, 1.0),
        }

    def estimate_travel_time(
        self,
        segment_length_km: float,
        predicted_congestion: float,
        typical_speed_kmh: float = 40,
    ) -> Tuple[float, float]:
        """
        Estimate travel time based on predicted congestion

        Args:
            segment_length_km: Length of road segment
            predicted_congestion: Predicted congestion rate (0-1)
            typical_speed_kmh: Typical speed when not congested

        Returns:
            Tuple of (estimated_minutes, worst_case_minutes)
        """

        # Speed degradation with congestion
        # At 50% congestion: ~70% of typical speed
        # At 100% congestion: ~20% of typical speed
        speed_factor = 1 - (predicted_congestion * 0.8)
        estimated_speed = typical_speed_kmh * speed_factor

        # Worst case: very low speed
        worst_speed = typical_speed_kmh * 0.2

        estimated_time = (segment_length_km / max(estimated_speed, 5)) * 60
        worst_case_time = (segment_length_km / max(worst_speed, 5)) * 60

        return (estimated_time, worst_case_time)

    def recommend_action(
        self, forecast: CongestionForecast
    ) -> str:
        """Generate recommended action based on forecast"""

        if forecast.risk_level == "critical":
            return "ACTIVATE_INCIDENT_RESPONSE | DIVERT_TRAFFIC | NOTIFY_AUTHORITIES"

        if forecast.risk_level == "high":
            if forecast.trend == "increasing":
                return "IMPLEMENT_DEMAND_MANAGEMENT | ACTIVATE_HOV_LANES"
            else:
                return "MAINTAIN_MONITORING | PREPARE_CONTINGENCIES"

        if forecast.risk_level == "medium":
            if forecast.trend == "increasing":
                return "INCREASE_TRAFFIC_MONITORING | ACTIVATE_WARNING_SIGNS"
            else:
                return "ROUTINE_MONITORING"

        return "NORMAL_OPERATIONS"

    def detect_anomaly(
        self, current_congestion: float, historical: np.ndarray
    ) -> Tuple[bool, str]:
        """
        Detect anomalous congestion values

        Returns:
            Tuple of (is_anomaly, description)
        """

        if len(historical) < 10:
            return (False, "Insufficient history")

        mean = np.mean(historical)
        std_dev = np.std(historical)

        # Z-score > 2.5 is anomaly
        z_score = (current_congestion - mean) / max(std_dev, 0.01)

        if abs(z_score) > 2.5:
            if current_congestion > mean:
                return (True, f"Congestion spike detected (Z-score: {z_score:.2f})")
            else:
                return (True, f"Unusual traffic relief (Z-score: {z_score:.2f})")

        return (False, "Normal variation")
