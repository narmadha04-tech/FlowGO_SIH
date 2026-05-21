# Backend Setup for Live Footage Prediction

## Overview

The backend has been enhanced with real-time vehicle detection capabilities using YOLOv8. The monitoring server now includes endpoints for processing live footage and images.

## New API Endpoints

### 1. `/api/predict` (POST)
Process a single image frame for vehicle detection.

**Request:**
- `file` (multipart/form-data): Image file (JPEG, PNG, etc.)
- `camera_id` (form): Camera identifier (default: "default")
- `approach` (form): Traffic approach direction - north, east, south, west (default: "unknown")
- `draw_boxes` (form): Whether to return annotated frame (default: "true")

**Response:**
```json
{
  "camera_id": "CAM-001",
  "approach": "north",
  "timestamp": 1234567890.123,
  "total_vehicles": 5,
  "detections": [
    {
      "class_name": "car",
      "confidence": 0.85,
      "bbox": [100, 200, 300, 400]
    }
  ],
  "class_counts": {
    "car": 3,
    "truck": 1,
    "bus": 1,
    "motorcycle": 0
  },
  "avg_confidence": 0.82,
  "frame_encoded": "base64_encoded_image_string"
}
```

### 2. `/api/predict-batch` (POST)
Process multiple images in batch.

**Request:**
- `files` (multipart/form-data): Multiple image files
- `camera_id` (form): Camera identifier
- `approach` (form): Traffic approach direction

**Response:**
```json
{
  "results": [
    {
      "filename": "image1.jpg",
      "camera_id": "CAM-001",
      "total_vehicles": 5,
      "detections": [...],
      "class_counts": {...}
    }
  ],
  "total": 1
}
```

## Backend Components

### 1. YOLO Model Integration
- **Location**: `rl/monitoring_server.py`
- **Model**: YOLOv8n (nano) - automatically downloads if not present
- **Vehicle Classes Detected**:
  - Car (class ID: 2)
  - Motorcycle (class ID: 3)
  - Bus (class ID: 5)
  - Truck (class ID: 7)
- **Confidence Threshold**: 0.25 (25%)

### 2. Image Processing
- Uses OpenCV for image decoding and annotation
- Base64 encoding for annotated frames
- Automatic bounding box drawing with labels

### 3. Live Counts Integration
- Updates `artifacts/camera_counts.json` with detection results
- Integrates with existing monitoring dashboard
- Timestamp tracking for each detection

## Dependencies

All required dependencies are already in `rl/requirements.txt`:
- `opencv-python>=4.8.0` - Image processing
- `ultralytics>=8.0.0` - YOLOv8 model
- `numpy>=1.24.0` - Array operations
- `fastapi>=0.104.0` - API framework
- `uvicorn[standard]>=0.24.0` - ASGI server

## Setup Instructions

### 1. Install Dependencies (if not already installed)
```bash
cd rl
pip install -r requirements.txt
```

### 2. Start the Monitoring Server
```bash
cd rl
python -m uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag enables auto-reload on code changes.

### 3. Verify Backend is Running
```bash
# Test health endpoint
curl http://localhost:8000/api/health

# Or use the test script
python test_prediction_api.py
```

## Testing

### Manual Testing with curl
```bash
# Test prediction endpoint
curl -X POST "http://localhost:8000/api/predict" \
  -F "file=@path/to/image.jpg" \
  -F "camera_id=CAM-001" \
  -F "approach=north" \
  -F "draw_boxes=true"
```

### Using Python Test Script
```bash
cd rl
python test_prediction_api.py
```

## Integration with Frontend

The frontend component `LiveFootagePrediction.tsx` automatically:
1. Sends image files to `/api/predict`
2. Displays detection results
3. Shows annotated frames with bounding boxes
4. Updates vehicle counts in real-time

## Model Loading

The YOLO model is lazy-loaded on first request:
- First prediction may take 2-3 seconds (model loading)
- Subsequent predictions are fast (~100-500ms per image)
- Model is cached in memory for performance

## Error Handling

The API handles:
- Invalid image formats → 400 Bad Request
- Processing errors → 500 Internal Server Error
- Missing files → 400 Bad Request

All errors return JSON with error details:
```json
{
  "detail": "Error message here"
}
```

## Performance Considerations

- **Model Size**: YOLOv8n is ~6MB, optimized for speed
- **Processing Time**: ~100-500ms per image (depending on hardware)
- **Memory**: ~200-300MB for model + processing
- **Concurrent Requests**: FastAPI handles async requests efficiently

## Troubleshooting

### Model Not Loading
- Check internet connection (first run downloads model)
- Verify `ultralytics` is installed: `pip install ultralytics`
- Check disk space (model is ~6MB)

### Image Processing Errors
- Verify `opencv-python` is installed: `pip install opencv-python`
- Check image format (JPEG, PNG supported)
- Ensure image file is not corrupted

### API Not Responding
- Verify server is running: `curl http://localhost:8000/api/health`
- Check port 8000 is not in use
- Review server logs for errors

## Next Steps

1. **Start the server**: `python -m uvicorn monitoring_server:app --reload`
2. **Test the API**: Use `test_prediction_api.py` or curl
3. **Access from frontend**: Open dashboard and navigate to "Live Prediction"
4. **Monitor logs**: Watch server output for any errors

The backend is ready to process live footage predictions! 🚀

