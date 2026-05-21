"""
test_prediction_api.py
-----------------------
Quick test script to verify the prediction API is working.
Run this after starting the monitoring server.
"""

import requests
from pathlib import Path

API_BASE = "http://localhost:8000"

def test_health():
    """Test the health endpoint."""
    print("Testing /api/health...")
    response = requests.get(f"{API_BASE}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    return response.status_code == 200

def test_predict_with_sample_image():
    """Test prediction with a sample image if available."""
    # Look for any image file in the data directory
    data_dir = Path(__file__).parent / "data"
    image_files = list(data_dir.glob("**/*.jpg")) + list(data_dir.glob("**/*.png"))
    
    if not image_files:
        print("No sample images found. Skipping prediction test.")
        print("To test prediction, place a JPG/PNG image in rl/data/ and run again.\n")
        return False
    
    test_image = image_files[0]
    print(f"Testing /api/predict with {test_image.name}...")
    
    with open(test_image, "rb") as f:
        files = {"file": (test_image.name, f, "image/jpeg")}
        data = {
            "camera_id": "TEST-CAM",
            "approach": "north",
            "draw_boxes": "true",
        }
        response = requests.post(f"{API_BASE}/api/predict", files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Success!")
        print(f"   Vehicles detected: {result['total_vehicles']}")
        print(f"   Classes: {result['class_counts']}")
        print(f"   Avg confidence: {result['avg_confidence']:.2%}\n")
        return True
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"   {response.text}\n")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Testing Prediction API")
    print("=" * 50)
    print()
    
    # Test health endpoint
    if not test_health():
        print("❌ Health check failed. Is the server running?")
        print("   Start it with: python -m uvicorn monitoring_server:app --reload")
        exit(1)
    
    # Test prediction endpoint
    test_predict_with_sample_image()
    
    print("=" * 50)
    print("Test complete!")
    print("=" * 50)

