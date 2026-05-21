# Streaming Code Usage Guide

## Quick Reference

### Current Implementation (NEW)
- **File**: `monitoring_server.py`
- **Endpoints**: `/api/predict`, `/api/predict-batch`
- **Status**: ✅ Active and recommended

### Old Implementation (Preserved)
- **File**: `streaming_old.py`
- **Function**: `process_frame()`
- **Status**: ✅ Available for backward compatibility

---

## Using NEW Implementation

### Via API (Recommended)

```bash
# Single frame
curl -X POST "http://localhost:8000/api/predict" \
  -F "file=@image.jpg" \
  -F "camera_id=CAM-001" \
  -F "approach=north" \
  -F "draw_boxes=true"

# Batch processing
curl -X POST "http://localhost:8000/api/predict-batch" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "camera_id=CAM-001" \
  -F "approach=north"
```

### Via Python

```python
import requests

# Single frame
with open("image.jpg", "rb") as f:
    files = {"file": f}
    data = {
        "camera_id": "CAM-001",
        "approach": "north",
        "draw_boxes": "true"
    }
    response = requests.post("http://localhost:8000/api/predict", files=files, data=data)
    result = response.json()
    print(f"Vehicles detected: {result['total_vehicles']}")
```

---

## Using OLD Implementation

### Direct Function Call

```python
from streaming_old import process_frame

# Process frame bytes
with open("image.jpg", "rb") as f:
    frame_bytes = f.read()
    result = process_frame(frame_bytes, draw_boxes=True)
    
    print(f"Total vehicles: {result['total_vehicles']}")
    print(f"Classes: {result['class_counts']}")
    print(f"Avg confidence: {result['avg_confidence']:.2%}")
    
    # Save annotated frame if available
    if result['frame_encoded']:
        import base64
        img_data = base64.b64decode(result['frame_encoded'])
        with open("annotated.jpg", "wb") as out:
            out.write(img_data)
```

### As Standalone Server

1. Uncomment server code in `streaming_old.py`
2. Run:
```bash
python streaming_old.py
# Server runs on port 8001
```

3. Use endpoint:
```bash
curl -X POST "http://localhost:8001/api/predict-old" \
  -F "file=@image.jpg" \
  -F "camera_id=CAM-001" \
  -F "approach=north"
```

---

## Feature Comparison

| Feature | OLD | NEW |
|---------|-----|-----|
| Standalone function | ✅ | ❌ |
| API endpoint | Optional | ✅ |
| Auto camera counts | ❌ | ✅ |
| Batch processing | ❌ | ✅ |
| Form data support | Basic | Full |
| Dashboard integration | Manual | Automatic |
| Async support | ❌ | ✅ |

---

## Migration Example

**Before (OLD):**
```python
from streaming_old import process_frame

result = process_frame(image_bytes)
count = result['total_vehicles']
```

**After (NEW):**
```python
import requests

response = requests.post(
    "http://localhost:8000/api/predict",
    files={"file": image_file},
    data={"camera_id": "CAM-001", "approach": "north"}
)
result = response.json()
count = result['total_vehicles']
```

---

## Both Implementations Available

You can use both simultaneously:

```python
# Use OLD for direct processing
from streaming_old import process_frame
result_old = process_frame(image_bytes)

# Use NEW for API calls
import requests
response = requests.post("http://localhost:8000/api/predict", ...)
result_new = response.json()
```

---

## File Locations

- **Current/Active**: `rl/monitoring_server.py` (lines 195-343)
- **Old Reference**: `rl/streaming_old.py`
- **New Reference**: `rl/streaming_new.py`
- **Original**: `rl/live_prediction_api.py` (preserved)

---

**Both implementations are preserved and available for use!** 🎥

