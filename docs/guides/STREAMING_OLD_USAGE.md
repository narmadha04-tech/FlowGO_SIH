# Old Streaming Implementation with Live Streaming Option

## Overview

This is the **OLD/ORIGINAL** streaming implementation with an **optional live streaming feature** added.

## Core Features (Original)

### 1. Standalone Frame Processing

```python
from streaming_old import process_frame

# Process a single frame
with open("image.jpg", "rb") as f:
    result = process_frame(f.read(), draw_boxes=True)
    print(f"Vehicles: {result['total_vehicles']}")
```

### 2. Simple API Endpoint

```python
# Run standalone server
python streaming_old.py

# Use endpoint
POST http://localhost:8001/api/predict-old
```

---

## Optional: Live Streaming Feature

### Starting a Live Stream

```python
from streaming_old import start_live_stream, register_stream_callback

# Define callback for results
def on_detection(result):
    print(f"Camera {result['camera_id']}: {result['total_vehicles']} vehicles")

# Start RTSP stream
start_live_stream(
    stream_url="rtsp://username:password@192.168.1.100:554/stream1",
    camera_id="CAM-001",
    approach="north",
    frame_callback=on_detection,
    fps=2,  # Process 2 frames per second
    draw_boxes=True
)
```

### Using API Endpoints

```bash
# Start live stream
curl -X POST "http://localhost:8001/api/stream/start" \
  -d "stream_url=rtsp://admin:pass@192.168.1.100:554/stream1" \
  -d "camera_id=CAM-001" \
  -d "approach=north" \
  -d "fps=2"

# Check active streams
curl http://localhost:8001/api/stream/active

# Stop stream
curl -X POST "http://localhost:8001/api/stream/stop" \
  -d "camera_id=CAM-001"
```

### WebSocket for Real-time Results

```python
import asyncio
import websockets
import json

async def receive_stream():
    uri = "ws://localhost:8001/api/stream/ws/CAM-001"
    async with websockets.connect(uri) as websocket:
        # First, start the stream via API
        # Then receive results via WebSocket
        while True:
            result = await websocket.recv()
            data = json.loads(result)
            print(f"Vehicles: {data['total_vehicles']}")

asyncio.run(receive_stream())
```

---

## Complete Example

```python
from streaming_old import (
    process_frame,
    start_live_stream,
    stop_live_stream,
    register_stream_callback
)

# ============================================
# Option 1: Process single frame (OLD way)
# ============================================
with open("image.jpg", "rb") as f:
    result = process_frame(f.read())
    print(f"Detected: {result['total_vehicles']} vehicles")

# ============================================
# Option 2: Start live stream (NEW optional feature)
# ============================================

# Define callback
def handle_detection(result):
    print(f"[{result['camera_id']}] {result['total_vehicles']} vehicles at {result['timestamp']}")
    if result['total_vehicles'] > 10:
        print("  ⚠️ High traffic detected!")

# Start stream
start_live_stream(
    stream_url="rtsp://admin:password@192.168.1.100:554/stream1",
    camera_id="CAM-001",
    approach="north",
    frame_callback=handle_detection,
    fps=2
)

# Stream runs in background thread
# Keep script running
import time
time.sleep(60)  # Run for 60 seconds

# Stop stream
stop_live_stream("CAM-001")
```

---

## Running the Server

### Basic Server (No Live Streaming)

```bash
python streaming_old.py
# Server runs on port 8001
# Only /api/predict-old endpoint available
```

### Server with Live Streaming

The server automatically includes live streaming endpoints:

```bash
python streaming_old.py
# Server runs on port 8001
# All endpoints available including live streaming
```

---

## API Endpoints

### Core (Original)

- `POST /api/predict-old` - Process single frame

### Optional Live Streaming

- `POST /api/stream/start` - Start live stream
- `POST /api/stream/stop` - Stop live stream
- `GET /api/stream/active` - List active streams
- `WS /api/stream/ws/{camera_id}` - WebSocket for real-time results

---

## Configuration

### Using Camera Config

```python
from camera_config_loader import get_config_manager
from streaming_old import start_live_stream

# Load camera config
config_mgr = get_config_manager()
cam = config_mgr.get_camera("CAM-001")

if cam and cam.type == "rtsp":
    # Start stream using config
    start_live_stream(
        stream_url=cam.get_url(),
        camera_id=cam.id,
        approach=cam.approach,
        fps=2
    )
```

---

## Features Comparison

| Feature | Core (Old) | With Live Streaming |
|---------|------------|---------------------|
| Single frame processing | ✅ | ✅ |
| Standalone function | ✅ | ✅ |
| Simple API endpoint | ✅ | ✅ |
| RTSP streaming | ❌ | ✅ |
| HTTP streaming | ❌ | ✅ |
| WebSocket support | ❌ | ✅ |
| Multiple streams | ❌ | ✅ |
| Background processing | ❌ | ✅ |

---

## Usage Scenarios

### Scenario 1: Simple Frame Processing (Original)

```python
# Just process images - no streaming needed
from streaming_old import process_frame

result = process_frame(image_bytes)
```

### Scenario 2: Add Live Streaming Later

```python
# Start with simple processing
from streaming_old import process_frame

# Later, add live streaming when needed
from streaming_old import start_live_stream

start_live_stream("rtsp://...", "CAM-001")
```

### Scenario 3: Full Live Streaming Setup

```python
# Use all features including live streaming
from streaming_old import (
    process_frame,
    start_live_stream,
    stop_live_stream,
    get_active_streams
)

# Start multiple streams
start_live_stream("rtsp://...", "CAM-001", "north")
start_live_stream("rtsp://...", "CAM-002", "east")

# Check active streams
print(get_active_streams())  # ['CAM-001', 'CAM-002']

# Stop when done
stop_live_stream("CAM-001")
```

---

## Summary

- **Core**: Original standalone implementation (always available)
- **Optional**: Live streaming feature (add when needed)
- **Flexible**: Use what you need, ignore what you don't

The old implementation remains simple, but you can optionally add live streaming capabilities! 🎥

