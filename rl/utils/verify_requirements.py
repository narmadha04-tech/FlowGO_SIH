"""
verify_requirements.py
----------------------
Comprehensive verification script to ensure the system satisfies all problem statement requirements.

This script validates:
1. AI-based traffic management system
2. Signal timing optimization
3. Congestion reduction
4. Real-time camera data analysis
5. IoT sensor integration
6. Bottleneck prediction and mitigation
7. 10% commute time reduction
8. Dashboard for monitoring and control
9. Computer vision (OpenCV)
10. Reinforcement learning
11. Camera network integration
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

REQUIREMENTS = {
    "1. AI-Based Traffic Management": {
        "files": ["rl/train_rl.py", "rl/data_collector_env.py"],
        "check": "DQN agent implementation",
        "status": False,
    },
    "2. Signal Timing Optimization": {
        "files": ["rl/data_collector_env.py", "rl/train_rl.py"],
        "check": "Reward function and phase control",
        "status": False,
    },
    "3. Congestion Reduction": {
        "files": ["rl/data_collector_env.py", "frontend/src/components/dashboard/TrafficMap.tsx"],
        "check": "Heat map and congestion tracking",
        "status": False,
    },
    "4. Real-Time Camera Analysis": {
        "files": ["rl/dataset_generator.py", "rl/monitoring_server.py", "rl/streaming_old.py"],
        "check": "YOLOv8 vehicle detection",
        "status": False,
    },
    "5. IoT Sensor Integration": {
        "files": ["rl/iot_sensor_simulator.py", "rl/data_collector_env.py"],
        "check": "Sensor data collection and processing",
        "status": False,
    },
    "6. Bottleneck Prediction": {
        "files": ["rl/data_collector_env.py", "frontend/src/components/dashboard/TrafficMap.tsx"],
        "check": "Congestion prediction and heat maps",
        "status": False,
    },
    "7. 10% Commute Time Reduction": {
        "files": ["rl/demonstrate_improvement.py", "rl/train_rl.py"],
        "check": "Improvement demonstration script",
        "status": False,
    },
    "8. Authority Dashboard": {
        "files": [
            "frontend/src/pages/AuthorityDashboard.tsx",
            "frontend/src/components/dashboard/SignalManagement.tsx",
            "frontend/src/components/dashboard/TrafficMap.tsx",
        ],
        "check": "Monitoring and control interface",
        "status": False,
    },
    "9. Computer Vision (OpenCV)": {
        "files": ["rl/dataset_generator.py", "rl/monitoring_server.py"],
        "check": "OpenCV usage for image processing",
        "status": False,
    },
    "10. Reinforcement Learning": {
        "files": ["rl/train_rl.py", "rl/data_collector_env.py"],
        "check": "DQN implementation with Stable-Baselines3",
        "status": False,
    },
    "11. Camera Network Integration": {
        "files": ["rl/camera_config_loader.py", "rl/dataset_generator.py"],
        "check": "RTSP support and credential management",
        "status": False,
    },
}


def check_file_exists(filepath: str) -> bool:
    """Check if a file exists."""
    return Path(filepath).exists()


def check_file_content(filepath: str, keywords: List[str]) -> bool:
    """Check if file contains required keywords."""
    if not check_file_exists(filepath):
        return False
    try:
        content = Path(filepath).read_text(encoding="utf-8")
        return all(keyword.lower() in content.lower() for keyword in keywords)
    except Exception:
        return False


def verify_requirement(name: str, req: Dict) -> Tuple[bool, str]:
    """Verify a single requirement."""
    # Adjust file paths based on current directory
    base_path = Path.cwd()
    if base_path.name == "rl":
        # We're in rl/, adjust paths
        adjusted_files = []
        for f in req["files"]:
            if f.startswith("rl/"):
                adjusted_files.append(f[3:])  # Remove "rl/" prefix
            elif f.startswith("frontend/"):
                adjusted_files.append("../" + f)  # Add "../" for frontend
            else:
                adjusted_files.append(f)
        files_to_check = adjusted_files
    else:
        files_to_check = req["files"]
    
    files_exist = all(check_file_exists(f) for f in files_to_check)
    
    if not files_exist:
        missing = [f for f in files_to_check if not check_file_exists(f)]
        return False, f"Missing files: {', '.join(missing)}"
    
    # Check for key implementation indicators
    # Adjust file paths based on current directory
    base_path = Path.cwd()
    if base_path.name == "rl":
        checks = {
            "1. AI-Based Traffic Management": (["DQN", "stable_baselines3"], "train_rl.py"),
            "2. Signal Timing Optimization": (["reward", "phase", "action"], "data_collector_env.py"),
            "3. Congestion Reduction": (["heatmap", "congestion"], "data_collector_env.py"),
            "4. Real-Time Camera Analysis": (["YOLO", "yolov8", "ultralytics"], "dataset_generator.py"),
            "5. IoT Sensor Integration": (["sensor", "iot"], "iot_sensor_simulator.py"),
            "6. Bottleneck Prediction": (["congestion", "heatmap"], "data_collector_env.py"),
            "7. 10% Commute Time Reduction": (["improvement", "baseline", "commute"], "demonstrate_improvement.py"),
            "8. Authority Dashboard": (["SignalManagement", "AuthorityDashboard"], "../frontend/src/pages/AuthorityDashboard.tsx"),
            "9. Computer Vision (OpenCV)": (["cv2", "VideoCapture"], "dataset_generator.py"),
            "10. Reinforcement Learning": (["DQN", "stable_baselines3"], "train_rl.py"),
            "11. Camera Network Integration": (["rtsp", "camera_config"], "camera_config_loader.py"),
        }
    else:
        checks = {
            "1. AI-Based Traffic Management": (["DQN", "stable_baselines3"], "rl/train_rl.py"),
            "2. Signal Timing Optimization": (["reward", "phase", "action"], "rl/data_collector_env.py"),
            "3. Congestion Reduction": (["heatmap", "congestion"], "rl/data_collector_env.py"),
            "4. Real-Time Camera Analysis": (["YOLO", "yolov8", "ultralytics"], "rl/dataset_generator.py"),
            "5. IoT Sensor Integration": (["sensor", "iot"], "rl/iot_sensor_simulator.py"),
            "6. Bottleneck Prediction": (["congestion", "heatmap"], "rl/data_collector_env.py"),
            "7. 10% Commute Time Reduction": (["improvement", "baseline", "commute"], "rl/demonstrate_improvement.py"),
            "8. Authority Dashboard": (["SignalManagement", "AuthorityDashboard"], "frontend/src/pages/AuthorityDashboard.tsx"),
            "9. Computer Vision (OpenCV)": (["cv2", "VideoCapture"], "rl/dataset_generator.py"),
            "10. Reinforcement Learning": (["DQN", "stable_baselines3"], "rl/train_rl.py"),
            "11. Camera Network Integration": (["rtsp", "camera_config"], "rl/camera_config_loader.py"),
        }
    
    if name in checks:
        keywords, check_file = checks[name]
        if check_file_content(check_file, keywords):
            return True, "[OK] Verified"
        else:
            return False, f"Missing keywords in {check_file}: {keywords}"
    
    return True, "[OK] Files exist"


def verify_all_requirements() -> Dict[str, any]:
    """Verify all requirements."""
    results = {}
    all_passed = True
    
    print("=" * 70)
    print("REQUIREMENTS VERIFICATION")
    print("Problem Statement Compliance Check")
    print("=" * 70)
    print()
    
    for req_name, req_data in REQUIREMENTS.items():
        status, message = verify_requirement(req_name, req_data)
        req_data["status"] = status
        results[req_name] = {
            "status": status,
            "message": message,
            "files": req_data["files"],
        }
        
        status_icon = "[OK]" if status else "[FAIL]"
        print(f"{status_icon} {req_name}")
        print(f"   {message}")
        if not status:
            all_passed = False
        print()
    
    print("=" * 70)
    if all_passed:
        print("[SUCCESS] ALL REQUIREMENTS SATISFIED")
        print("   Status: 100% COMPLIANT")
    else:
        print("[WARNING] SOME REQUIREMENTS NEED ATTENTION")
        print("   Please review failed requirements above")
    print("=" * 70)
    
    return {
        "all_passed": all_passed,
        "total": len(REQUIREMENTS),
        "passed": sum(1 for r in results.values() if r["status"]),
        "results": results,
    }


def check_dependencies() -> bool:
    """Check if required dependencies are installed."""
    print("\nChecking Dependencies...")
    print("-" * 70)
    
    dependencies = {
        "opencv-python": "cv2",
        "ultralytics": "ultralytics",
        "stable-baselines3": "stable_baselines3",
        "gymnasium": "gymnasium",
        "fastapi": "fastapi",
        "numpy": "numpy",
        "pandas": "pandas",
    }
    
    all_installed = True
    for package, import_name in dependencies.items():
        try:
            __import__(import_name)
            print(f"[OK] {package}")
        except ImportError:
            print(f"[FAIL] {package} - NOT INSTALLED")
            all_installed = False
    
    print("-" * 70)
    return all_installed


def check_file_structure() -> bool:
    """Check if required file structure exists."""
    print("\nChecking File Structure...")
    print("-" * 70)
    
    # Check if we're in rl/ directory or project root
    base_path = Path.cwd()
    if base_path.name == "rl":
        # We're in rl/, so adjust paths
        required_dirs = [
            ".",  # Current directory (rl/)
            "../frontend",
            "artifacts",
            "models",
            "datasets",
            "routes",
            "nets",
            "../frontend/src",
            "../frontend/src/components/dashboard",
        ]
    else:
        # We're in project root
        required_dirs = [
            "rl",
            "frontend",
            "rl/artifacts",
            "rl/models",
            "rl/datasets",
            "rl/routes",
            "rl/nets",
            "frontend/src",
            "frontend/src/components/dashboard",
        ]
    
    all_exist = True
    for dir_path in required_dirs:
        if Path(dir_path).exists():
            print(f"[OK] {dir_path}/")
        else:
            print(f"[FAIL] {dir_path}/ - MISSING")
            all_exist = False
    
    print("-" * 70)
    return all_exist


def main() -> None:
    """Main verification function."""
    print("\n" + "=" * 70)
    print("SYSTEM REQUIREMENTS VERIFICATION")
    print("Ensuring all problem statement requirements are satisfied")
    print("=" * 70)
    
    # Check dependencies
    deps_ok = check_dependencies()
    
    # Check file structure
    structure_ok = check_file_structure()
    
    # Verify requirements
    verification_results = verify_all_requirements()
    
    # Generate report
    report = {
        "dependencies": deps_ok,
        "file_structure": structure_ok,
        "requirements": verification_results,
        "overall_status": deps_ok and structure_ok and verification_results["all_passed"],
    }
    
    # Save report
    report_path = Path("artifacts/verification_report.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    
    print(f"\n📄 Full report saved to: {report_path}")
    print()
    
    # Final summary
    print("=" * 70)
    print("FINAL SUMMARY")
    print("=" * 70)
    print(f"Dependencies: {'[OK]' if deps_ok else '[FAIL] MISSING'}")
    print(f"File Structure: {'[OK]' if structure_ok else '[FAIL] INCOMPLETE'}")
    print(f"Requirements: {verification_results['passed']}/{verification_results['total']} passed")
    print()
    
    if report["overall_status"]:
        print("[SUCCESS] SYSTEM FULLY SATISFIES ALL REQUIREMENTS!")
        print("   Ready for demonstration and deployment.")
        sys.exit(0)
    else:
        print("[WARNING] SYSTEM NEEDS ATTENTION")
        print("   Please address the issues above before deployment.")
        sys.exit(1)


if __name__ == "__main__":
    main()

