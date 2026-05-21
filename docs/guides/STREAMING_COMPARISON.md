# Streaming Implementation Comparison

This document explains the differences between the old and new streaming implementations, and how to use both.

## 📁 File Structure

```
rl/
├── streaming_old.py          # OLD/ORIGINAL implementation (standalone)
├── streaming_new.py          # NEW/CURRENT implementation (integrated)
├── live_prediction_api.py    # Original file (preserved for reference)
└── monitoring_server.py       # Current server with integrated streaming
```

## 🔄 Two Implementations

### OLD Implementation (`streaming_old.py`)

**Characteristics:**
- Standalone processing functions
- Simple frame processing
- Can be used as separate module
- Original implementation preserved

**Key Features:**
- `process_frame()` - Standalone function
- Simple return format
- No automatic camera counts update
- Can run as separate server (commented out)

**Usage:**
```python
from streaming_old import process_frame

# Process frame bytes
with open("image.jpg", "rb") as f:
    result = process_frame(f.read(), draw_boxes=True)
    print(result["total_vehicles"])
```

**Endpoints (if used as standalone server):**
- `POST /api/predict-old` - Process single frame

---

### NEW Implementation (`streaming_new.py` / `monitoring_server.py`)

**Characteristics:**
- Integrated with monitoring server
- Automatic camera counts update
- Better error handling
- Form data support
- Batch processing

**Key Features:**
- `predict_frame_new()` - Async function with Form data
- `predict_batch_new()` - Batch processing
- Automatic `camera_counts.json` update
- Integrated with dashboard

**Usage:**
```python
# Already integrated in monitoring_server.py
# Access via API endpoints
```

**Endpoints (in monitoring_server.py):**
- `POST /api/predict` - Process single frame (current)
- `POST /api/predict-batch` - Process multiple frames

---

## 📊 Comparison Table

| Feature | OLD (`streaming_old.py`) | NEW (`monitoring_server.py`) |
|---------|-------------------------|------------------------------|
| **Integration** | Standalone | Integrated with monitoring server |
| **Camera Counts** | Manual update | Automatic update to `camera_counts.json` |
| **Form Data** | Basic | Full Form data support |
| **Batch Processing** | No | Yes (`/api/predict-batch`) |
| **Error Handling** | Basic | Enhanced with HTTPException |
| **Image Quality** | Default | Configurable (85% JPEG quality) |
| **Async Support** | No | Yes (async/await) |
| **Dashboard Integration** | Manual | Automatic |

---

## 🚀 How to Use Both

### Option 1: Use New Implementation (Recommended)

The new implementation is already integrated in `monitoring_server.py`:

```bash
# Start server
cd rl
python -m uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --reload

# Use endpoints
curl -X POST "http://localhost:8000/api/predict" \
  -F "file=@image.jpg" \
  -F "camera_id=CAM-001" \
  -F "approach=north"
```

### Option 2: Use Old Implementation

If you need the old standalone version:

```python
# Import old functions
from streaming_old import process_frame, get_model

# Use directly
with open("image.jpg", "rb") as f:
    result = process_frame(f.read(), draw_boxes=True)
    print(f"Vehicles: {result['total_vehicles']}")
```

### Option 3: Run Old as Separate Server

Uncomment the server code in `streaming_old.py`:

```python
# In streaming_old.py, uncomment the server section
# Then run:
python streaming_old.py
# Server will run on port 8001
```

---

## 🔧 Migration Guide

### Migrating from OLD to NEW

**OLD Code:**
```python
from streaming_old import process_frame

with open("image.jpg", "rb") as f:
    result = process_frame(f.read())
```

**NEW Code:**
```python
import requests

with open("image.jpg", "rb") as f:
    files = {"file": f}
    data = {"camera_id": "CAM-001", "approach": "north"}
    response = requests.post("http://localhost:8000/api/predict", files=files, data=data)
    result = response.json()
```

---

## 📝 Code Differences

### OLD: Simple Function
```python
def process_frame(frame_bytes: bytes, draw_boxes: bool = True) -> Dict[str, Any]:
    # Process frame
    # Return results
    return {"total_vehicles": count, ...}
```

### NEW: Async with Integration
```python
async def predict_frame_new(
    file: UploadFile = File(...),
    camera_id: str = Form("default"),
    approach: str = Form("unknown"),
    draw_boxes: str = Form("true"),
) -> Dict[str, Any]:
    # Process frame
    # Update camera_counts.json automatically
    # Return results with metadata
    return {"camera_id": ..., "timestamp": ..., ...}
```

---

## 🎯 When to Use Which

### Use OLD Implementation When:
- You need standalone processing (no server)
- You want simple function calls
- You're integrating into existing code
- You don't need camera counts auto-update

### Use NEW Implementation When:
- You want full integration with dashboard
- You need automatic camera counts
- You want batch processing
- You're using the monitoring server

---

## 🔄 Switching Between Implementations

### In monitoring_server.py

The current server uses the NEW implementation. To switch to OLD:

1. Import old functions:
```python
from streaming_old import process_frame
```

2. Modify endpoint:
```python
@app.post("/api/predict")
async def predict_frame(...):
    contents = await file.read()
    result = process_frame(contents, draw_boxes=draw_boxes_bool)
    return result
```

### Keep Both Available

You can have both endpoints:

```python
# NEW endpoint (current)
@app.post("/api/predict")
async def predict_frame_new(...):
    # Uses new implementation
    ...

# OLD endpoint (for compatibility)
@app.post("/api/predict-old")
async def predict_frame_old(...):
    contents = await file.read()
    result = process_frame(contents)  # Old function
    return result
```

---

## 📚 File Locations

- **OLD Implementation**: `rl/streaming_old.py`
- **NEW Implementation**: `rl/streaming_new.py` (reference) + `rl/monitoring_server.py` (actual)
- **Original File**: `rl/live_prediction_api.py` (preserved)

---

## ✅ Summary

- **OLD**: Standalone, simple, preserved for backward compatibility
- **NEW**: Integrated, feature-rich, recommended for new projects
- **Both**: Available and can be used together

Choose based on your needs! 🚦

