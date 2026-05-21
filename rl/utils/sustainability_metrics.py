"""
Sustainability Metrics Engine
Calculates fuel consumption, CO2 emissions, and provides eco-routing suggestions
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime, timedelta
import numpy as np

class SustainabilityMetricsEngine:
    """Calculate sustainability metrics for traffic."""
    
    # Emission factors (g CO2 per liter fuel for different vehicle types)
    EMISSION_FACTORS = {
        "car": 2.31,  # kg CO2 per liter
        "truck": 2.68,
        "bus": 0.85,  # per passenger
        "motorcycle": 0.15,
        "bicycle": 0.0,
        "person": 0.0,
    }
    
    # Fuel consumption rates (liters per 100km at various speeds)
    FUEL_CONSUMPTION = {
        "car": {"idle": 0.5, "slow": 10.0, "normal": 7.0, "fast": 8.5},
        "truck": {"idle": 1.2, "slow": 15.0, "normal": 12.0, "fast": 14.0},
        "bus": {"idle": 0.8, "slow": 20.0, "normal": 25.0, "fast": 28.0},
        "motorcycle": {"idle": 0.1, "slow": 3.0, "normal": 3.5, "fast": 4.0},
    }
    
    def __init__(self):
        self.metrics_history: List[Dict[str, Any]] = []
        self.eco_routes: List[Dict[str, Any]] = []
    
    def calculate_emissions(
        self,
        vehicle_type: str,
        distance_km: float,
        avg_speed: float,
        idling_time_minutes: float = 0
    ) -> Dict[str, float]:
        """
        Calculate emissions for a vehicle journey.
        
        Args:
            vehicle_type: Type of vehicle (car, truck, bus, motorcycle)
            distance_km: Distance traveled in kilometers
            avg_speed: Average speed in km/h
            idling_time_minutes: Time spent idling in minutes
        
        Returns:
            Dictionary with fuel_used (liters) and co2_emitted (kg)
        """
        vehicle_type = vehicle_type.lower()
        
        # Determine speed category
        if avg_speed < 20:
            speed_category = "slow"
        elif avg_speed < 50:
            speed_category = "normal"
        elif avg_speed < 80:
            speed_category = "fast"
        else:
            speed_category = "fast"
        
        # Get fuel consumption rate
        consumption_map = self.FUEL_CONSUMPTION.get(vehicle_type, self.FUEL_CONSUMPTION["car"])
        fuel_rate = consumption_map.get(speed_category, consumption_map["normal"])
        
        # Calculate fuel used for distance
        fuel_distance = (distance_km / 100.0) * fuel_rate
        
        # Add idling consumption
        idling_consumption = (idling_time_minutes / 60.0) * consumption_map.get("idle", 0.5)
        
        total_fuel = fuel_distance + idling_consumption
        
        # Calculate CO2 emissions
        emission_factor = self.EMISSION_FACTORS.get(vehicle_type, 2.31)
        co2_emitted = total_fuel * emission_factor
        
        return {
            "fuel_used_liters": round(total_fuel, 2),
            "co2_emitted_kg": round(co2_emitted, 2),
            "distance_km": distance_km,
            "avg_speed_kmh": avg_speed,
            "idling_time_min": idling_time_minutes,
            "vehicle_type": vehicle_type,
        }
    
    def calculate_network_sustainability(
        self,
        vehicles_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate sustainability metrics for entire network.
        
        Args:
            vehicles_data: List of vehicle telemetry data
        
        Returns:
            Network-level sustainability metrics
        """
        total_co2 = 0.0
        total_fuel = 0.0
        vehicle_count = 0
        avg_speed_total = 0.0
        idling_count = 0
        
        for vehicle in vehicles_data:
            vehicle_type = vehicle.get("type", "car")
            distance = vehicle.get("distance_km", 0)
            speed = vehicle.get("speed_kmh", 0)
            wait_time = vehicle.get("wait_time_sec", 0)
            
            # Convert wait time to idling time
            idling_minutes = wait_time / 60.0
            if wait_time > 10:
                idling_count += 1
            
            emissions = self.calculate_emissions(
                vehicle_type,
                distance,
                speed,
                idling_minutes
            )
            
            total_co2 += emissions["co2_emitted_kg"]
            total_fuel += emissions["fuel_used_liters"]
            avg_speed_total += speed
            vehicle_count += 1
        
        avg_speed = avg_speed_total / max(1, vehicle_count)
        idling_percentage = (idling_count / max(1, vehicle_count)) * 100
        
        return {
            "total_co2_emitted_kg": round(total_co2, 2),
            "total_fuel_wasted_liters": round(total_fuel, 2),
            "total_fuel_cost_usd": round(total_fuel * 1.50, 2),  # $1.50 per liter average
            "avg_vehicle_speed_kmh": round(avg_speed, 1),
            "vehicles_processed": vehicle_count,
            "vehicles_idling_percentage": round(idling_percentage, 1),
            "equivalent_co2_trees_offset": round(total_co2 / 21, 1),  # 1 tree absorbs ~21kg CO2/year
        }
    
    def suggest_eco_routes(
        self,
        origin: tuple,
        destination: tuple,
        current_traffic: Dict[str, Any],
        vehicle_type: str = "car"
    ) -> List[Dict[str, Any]]:
        """
        Suggest eco-friendly routes based on current traffic conditions.
        
        Args:
            origin: (lat, lng) tuple
            destination: (lat, lng) tuple
            current_traffic: Traffic conditions on different routes
            vehicle_type: Type of vehicle
        
        Returns:
            List of route suggestions with eco-scores
        """
        routes = [
            {
                "route_id": "fast",
                "name": "Fastest Route",
                "distance_km": 15.2,
                "estimated_time_min": 18,
                "avg_speed_expected": 50,
                "congestion_level": "high",
            },
            {
                "route_id": "eco",
                "name": "Eco Route",
                "distance_km": 16.8,
                "estimated_time_min": 22,
                "avg_speed_expected": 45,
                "congestion_level": "medium",
            },
            {
                "route_id": "balanced",
                "name": "Balanced Route",
                "distance_km": 15.8,
                "estimated_time_min": 20,
                "avg_speed_expected": 47,
                "congestion_level": "low",
            },
        ]
        
        # Score routes
        for route in routes:
            # Calculate emissions for this route
            emissions = self.calculate_emissions(
                vehicle_type,
                route["distance_km"],
                route["avg_speed_expected"]
            )
            
            fuel_liters = emissions["fuel_used_liters"]
            co2_kg = emissions["co2_emitted_kg"]
            
            # Calculate eco-score (0-100)
            eco_score = max(0, 100 - (co2_kg * 10))
            
            # Add recommendations
            recommendations = []
            if route["congestion_level"] == "high":
                recommendations.append("High congestion - consider alternative route")
            if fuel_liters > 1.5:
                recommendations.append("High fuel consumption expected")
            if route["avg_speed_expected"] < 40:
                recommendations.append("Lower speed expected - check traffic")
            
            route.update({
                "estimated_fuel_liters": round(fuel_liters, 2),
                "estimated_co2_kg": round(co2_kg, 2),
                "estimated_cost_usd": round(fuel_liters * 1.50, 2),
                "eco_score": round(eco_score, 1),
                "recommendations": recommendations,
            })
        
        # Sort by eco-score
        routes.sort(key=lambda x: x["eco_score"], reverse=True)
        
        return routes
    
    def calculate_reduction_potential(
        self,
        baseline_metrics: Dict[str, Any],
        optimized_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate potential reduction from optimization.
        """
        baseline_co2 = baseline_metrics.get("total_co2_emitted_kg", 0)
        optimized_co2 = optimized_metrics.get("total_co2_emitted_kg", 0)
        
        baseline_fuel = baseline_metrics.get("total_fuel_wasted_liters", 0)
        optimized_fuel = optimized_metrics.get("total_fuel_wasted_liters", 0)
        
        co2_reduction = baseline_co2 - optimized_co2
        fuel_reduction = baseline_fuel - optimized_fuel
        cost_reduction = fuel_reduction * 1.50
        
        co2_reduction_pct = (co2_reduction / max(1, baseline_co2)) * 100 if baseline_co2 > 0 else 0
        fuel_reduction_pct = (fuel_reduction / max(1, baseline_fuel)) * 100 if baseline_fuel > 0 else 0
        
        return {
            "co2_reduction_kg": round(co2_reduction, 2),
            "co2_reduction_percentage": round(co2_reduction_pct, 1),
            "fuel_reduction_liters": round(fuel_reduction, 2),
            "fuel_reduction_percentage": round(fuel_reduction_pct, 1),
            "cost_reduction_usd": round(cost_reduction, 2),
            "trees_offset_additional": round(co2_reduction / 21, 1),
            "equivalent_car_miles_removed": round(co2_reduction / 0.412, 1),  # 0.412 kg CO2 per car mile
        }
    
    def record_metric(self, metric: Dict[str, Any]):
        """Record a sustainability metric with timestamp."""
        metric["timestamp"] = datetime.now().isoformat()
        self.metrics_history.append(metric)
        
        # Keep last 1000 records
        if len(self.metrics_history) > 1000:
            self.metrics_history = self.metrics_history[-1000:]
    
    def get_daily_report(self) -> Dict[str, Any]:
        """Generate daily sustainability report."""
        today = datetime.now().date()
        today_metrics = [
            m for m in self.metrics_history
            if datetime.fromisoformat(m["timestamp"]).date() == today
        ]
        
        if not today_metrics:
            return {
                "date": str(today),
                "total_co2_kg": 0.0,
                "total_fuel_liters": 0.0,
                "vehicles_counted": 0,
                "message": "No data for today"
            }
        
        total_co2 = sum(m.get("co2_emitted_kg", 0) for m in today_metrics)
        total_fuel = sum(m.get("fuel_used_liters", 0) for m in today_metrics)
        
        return {
            "date": str(today),
            "total_co2_kg": round(total_co2, 2),
            "total_fuel_liters": round(total_fuel, 2),
            "vehicles_counted": len(today_metrics),
            "avg_co2_per_vehicle": round(total_co2 / max(1, len(today_metrics)), 2),
            "avg_fuel_per_vehicle": round(total_fuel / max(1, len(today_metrics)), 2),
            "trees_offset": round(total_co2 / 21, 1),
        }
    
    def export_sustainability_report(self, filepath: Path) -> Path:
        """Export sustainability metrics to JSON file."""
        report = {
            "generated_at": datetime.now().isoformat(),
            "daily_report": self.get_daily_report(),
            "total_records": len(self.metrics_history),
            "recent_metrics": self.metrics_history[-100:],  # Last 100 records
            "eco_routes_generated": len(self.eco_routes),
        }
        
        filepath.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return filepath
