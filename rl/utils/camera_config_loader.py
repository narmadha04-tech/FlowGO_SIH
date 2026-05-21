"""
camera_config_loader.py
-----------------------
Utility module for loading and managing camera credentials and configurations.
"""

from __future__ import annotations

import json
import urllib.parse
from pathlib import Path
from typing import Any, Dict, List, Optional

CONFIG_FILE = Path(__file__).parent.parent / "config" / "camera_config.json"
EXAMPLE_CONFIG = Path(__file__).parent.parent / "config" / "camera_config.example.json"


class CameraConfig:
    """Represents a single camera configuration."""
    
    def __init__(self, config_dict: Dict[str, Any]) -> None:
        self.id = config_dict.get("id", "UNKNOWN")
        self.name = config_dict.get("name", "")
        self.location = config_dict.get("location", "")
        self.type = config_dict.get("type", "file")  # 'rtsp', 'file', 'http', etc.
        self.approach = config_dict.get("approach", "unknown")
        self.enabled = config_dict.get("enabled", True)
        self.credentials = config_dict.get("credentials", {})
        self._raw_config = config_dict
    
    def get_url(self) -> str:
        """Get the full URL with credentials embedded if RTSP."""
        if self.type == "rtsp":
            # Check if URL template is provided
            if "url_template" in self._raw_config:
                username = self.credentials.get("username", "")
                password = self.credentials.get("password", "")
                ip = self._raw_config.get("ip", "")
                port = self._raw_config.get("port", 554)
                path = self._raw_config.get("path", "/stream1")
                
                # URL encode credentials
                username_enc = urllib.parse.quote(username, safe="")
                password_enc = urllib.parse.quote(password, safe="")
                
                return f"rtsp://{username_enc}:{password_enc}@{ip}:{port}{path}"
            elif "url" in self._raw_config:
                url = self._raw_config["url"]
                # Replace placeholder if exists
                if "{username}" in url or "{password}" in url:
                    username = self.credentials.get("username", "")
                    password = self.credentials.get("password", "")
                    username_enc = urllib.parse.quote(username, safe="")
                    password_enc = urllib.parse.quote(password, safe="")
                    url = url.replace("{username}", username_enc)
                    url = url.replace("{password}", password_enc)
                return url
            else:
                raise ValueError(f"Camera {self.id}: No URL or URL template provided")
        elif self.type == "file":
            return self._raw_config.get("url", "")
        else:
            return self._raw_config.get("url", "")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary (without sensitive data)."""
        safe_dict = self._raw_config.copy()
        if "credentials" in safe_dict:
            safe_dict["credentials"] = {
                "username": self.credentials.get("username", ""),
                "password": "***HIDDEN***"
            }
        return safe_dict


class CameraConfigManager:
    """Manages camera configurations and credentials."""
    
    def __init__(self, config_path: Optional[Path] = None) -> None:
        self.config_path = config_path or CONFIG_FILE
        self.cameras: List[CameraConfig] = []
        self.settings: Dict[str, Any] = {}
        self.load()
    
    def load(self) -> None:
        """Load camera configuration from JSON file."""
        if not self.config_path.exists():
            if EXAMPLE_CONFIG.exists():
                raise FileNotFoundError(
                    f"Camera config not found: {self.config_path}\n"
                    f"Please copy {EXAMPLE_CONFIG} to {self.config_path} and update with your credentials."
                )
            else:
                raise FileNotFoundError(f"Camera config not found: {self.config_path}")
        
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in config file: {e}")
        
        # Load cameras
        self.cameras = []
        for cam_data in data.get("cameras", []):
            self.cameras.append(CameraConfig(cam_data))
        
        # Load settings
        self.settings = {
            "default_rtsp_port": data.get("default_rtsp_port", 554),
            "default_rtsp_path": data.get("default_rtsp_path", "/stream1"),
            "connection_timeout": data.get("connection_timeout", 10),
            "reconnect_attempts": data.get("reconnect_attempts", 3),
            "frame_buffer_size": data.get("frame_buffer_size", 30),
        }
    
    def get_camera(self, camera_id: str) -> Optional[CameraConfig]:
        """Get camera configuration by ID."""
        for cam in self.cameras:
            if cam.id == camera_id:
                return cam
        return None
    
    def get_enabled_cameras(self) -> List[CameraConfig]:
        """Get all enabled cameras."""
        return [cam for cam in self.cameras if cam.enabled]
    
    def get_cameras_by_approach(self, approach: str) -> List[CameraConfig]:
        """Get cameras for a specific approach."""
        return [cam for cam in self.cameras if cam.approach.lower() == approach.lower() and cam.enabled]
    
    def get_all_urls(self) -> List[str]:
        """Get all camera URLs (for dataset generation)."""
        return [cam.get_url() for cam in self.get_enabled_cameras()]
    
    def save(self, output_path: Optional[Path] = None) -> None:
        """Save current configuration (without passwords)."""
        output = output_path or self.config_path
        data = {
            "cameras": [cam.to_dict() for cam in self.cameras],
            **self.settings
        }
        with open(output, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)


# Global instance
_config_manager: Optional[CameraConfigManager] = None


def get_config_manager() -> CameraConfigManager:
    """Get or create global config manager instance."""
    global _config_manager
    if _config_manager is None:
        _config_manager = CameraConfigManager()
    return _config_manager

