"""
iot_sensor_simulator.py
-----------------------
Simulates IoT sensors (lane detectors, occupancy sensors, speed sensors)
that can be integrated with real IoT infrastructure via MQTT/HTTP.

This addresses the problem statement requirement for IoT sensor integration.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np


@dataclass
class SensorReading:
    """Represents a single IoT sensor reading."""
    sensor_id: str
    sensor_type: str  # "lane_detector", "occupancy", "speed", "queue"
    location: str
    timestamp: float
    value: float
    unit: str
    metadata: Dict


class IoTSensorSimulator:
    """Simulates IoT sensors for traffic monitoring."""
    
    def __init__(self, output_path: Optional[Path] = None):
        self.output_path = output_path or Path("artifacts/iot_sensors.json")
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self.sensors: Dict[str, SensorReading] = {}
    
    def update_from_sumo(self, traci_conn, lane_ids: List[str]) -> Dict[str, SensorReading]:
        """Update sensor readings from SUMO simulation (can be replaced with real IoT API)."""
        readings = {}
        
        for lane_id in lane_ids:
            try:
                # Lane detector sensor
                halting = traci_conn.lane.getLastStepHaltingNumber(lane_id)
                readings[f"{lane_id}_detector"] = SensorReading(
                    sensor_id=f"{lane_id}_detector",
                    sensor_type="lane_detector",
                    location=lane_id,
                    timestamp=time.time(),
                    value=float(halting),
                    unit="vehicles",
                    metadata={"lane": lane_id, "status": "active"}
                )
                
                # Occupancy sensor
                occupancy = traci_conn.lane.getLastStepOccupancy(lane_id)
                readings[f"{lane_id}_occupancy"] = SensorReading(
                    sensor_id=f"{lane_id}_occupancy",
                    sensor_type="occupancy",
                    location=lane_id,
                    timestamp=time.time(),
                    value=float(occupancy),
                    unit="percent",
                    metadata={"lane": lane_id, "threshold": 80.0}
                )
                
                # Speed sensor
                speed = traci_conn.lane.getLastStepMeanSpeed(lane_id)
                readings[f"{lane_id}_speed"] = SensorReading(
                    sensor_id=f"{lane_id}_speed",
                    sensor_type="speed",
                    location=lane_id,
                    timestamp=time.time(),
                    value=float(speed),
                    unit="m/s",
                    metadata={"lane": lane_id, "max_speed": 13.89}
                )
                
            except Exception as e:
                print(f"Warning: Could not read sensor for {lane_id}: {e}")
        
        self.sensors.update(readings)
        return readings
    
    def save_readings(self) -> None:
        """Save sensor readings to JSON file (can be replaced with MQTT publish)."""
        data = {
            "timestamp": time.time(),
            "sensors": [asdict(reading) for reading in self.sensors.values()]
        }
        self.output_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    
    def get_sensor_data(self) -> Dict:
        """Get current sensor data (for API consumption)."""
        return {
            "timestamp": time.time(),
            "sensors": [asdict(reading) for reading in self.sensors.values()],
            "total_sensors": len(self.sensors),
            "sensor_types": list(set(r.sensor_type for r in self.sensors.values()))
        }


# Example integration with real IoT sensors (MQTT)
def integrate_mqtt_sensor(mqtt_broker: str, topic: str) -> None:
    """
    Example function showing how to integrate with real MQTT IoT sensors.
    Replace SUMO simulation with actual sensor data.
    """
    try:
        import paho.mqtt.client as mqtt
        
        def on_message(client, userdata, message):
            payload = json.loads(message.payload.decode())
            # Process real IoT sensor data
            sensor_reading = SensorReading(
                sensor_id=payload["sensor_id"],
                sensor_type=payload["type"],
                location=payload["location"],
                timestamp=payload["timestamp"],
                value=payload["value"],
                unit=payload["unit"],
                metadata=payload.get("metadata", {})
            )
            # Update system with real sensor data
            print(f"Received IoT sensor data: {sensor_reading}")
        
        client = mqtt.Client()
        client.on_message = on_message
        client.connect(mqtt_broker, 1883, 60)
        client.subscribe(topic)
        client.loop_start()
        
    except ImportError:
        print("MQTT library not installed. Install with: pip install paho-mqtt")


if __name__ == "__main__":
    # Example usage
    simulator = IoTSensorSimulator()
    print("IoT Sensor Simulator initialized")
    print("In production, replace SUMO data with real IoT sensor APIs")

