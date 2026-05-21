# Camera Credentials Configuration Guide

## Overview

This guide explains how to configure live feed credentials (RTSP streams, CCTV cameras) for the traffic monitoring system.

## Configuration File Location

**Main Config File**: `rl/camera_config.json`  
**Example Template**: `rl/camera_config.example.json`

## Quick Setup

1. **Copy the example config:**
   ```bash
   cd rl
   cp camera_config.example.json camera_config.json
   ```

2. **Edit `camera_config.json`** with your camera credentials

3. **Use the config in your scripts:**
   ```bash
   # Generate dataset from configured cameras
   python dataset_generator.py --use-config
   
   # Or combine with manual sources
   python dataset_generator.py --use-config --sources data/cctv/video.mp4
   ```

## Configuration Format

### Basic Structure

```json
{
  "cameras": [
    {
      "id": "CAM-001",
      "name": "North Approach Camera",
      "location": "Junction 12 - North",
      "type": "rtsp",
      "approach": "north",
      "enabled": true,
      "credentials": {
        "username": "admin",
        "password": "your_password"
      }
    }
  ],
  "default_rtsp_port": 554,
  "connection_timeout": 10
}
```

### Camera Configuration Options

#### RTSP Stream (with credentials)

```json
{
  "id": "CAM-001",
  "name": "Camera Name",
  "location": "Location description",
  "type": "rtsp",
  "approach": "north",
  "enabled": true,
  "ip": "192.168.1.100",
  "port": 554,
  "path": "/stream1",
  "credentials": {
    "username": "admin",
    "password": "your_password_here"
  }
}
```

**Alternative RTSP format (direct URL):**
```json
{
  "id": "CAM-002",
  "type": "rtsp",
  "url": "rtsp://admin:password@192.168.1.100:554/stream1",
  "approach": "east",
  "enabled": true
}
```

#### Local Video File

```json
{
  "id": "CAM-003",
  "name": "Local Video",
  "type": "file",
  "url": "data/cctv/cam1_north.mp4",
  "approach": "north",
  "enabled": true
}
```

#### HTTP Stream

```json
{
  "id": "CAM-004",
  "type": "http",
  "url": "http://192.168.1.100:8080/video",
  "approach": "south",
  "enabled": true
}
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique camera identifier (e.g., "CAM-001") |
| `name` | No | Human-readable camera name |
| `location` | No | Physical location description |
| `type` | Yes | Stream type: `rtsp`, `file`, `http`, `https` |
| `approach` | Yes | Traffic approach: `north`, `east`, `south`, `west` |
| `enabled` | No | Whether camera is active (default: `true`) |
| `credentials` | For RTSP | Username and password object |
| `ip` | For RTSP | Camera IP address |
| `port` | For RTSP | RTSP port (default: 554) |
| `path` | For RTSP | Stream path (e.g., "/stream1") |
| `url` | Alternative | Direct URL (credentials embedded) |

## Security Best Practices

### 1. Never Commit Credentials

Add `camera_config.json` to `.gitignore`:
```gitignore
# Camera credentials (sensitive)
rl/camera_config.json
```

### 2. Use Environment Variables (Advanced)

For production, you can use environment variables:

```python
import os
credentials = {
    "username": os.getenv("CAMERA_USERNAME", "admin"),
    "password": os.getenv("CAMERA_PASSWORD", "")
}
```

### 3. Use Separate Config Files

- Development: `camera_config.dev.json`
- Production: `camera_config.prod.json`
- Testing: `camera_config.test.json`

## Usage Examples

### Example 1: Generate Dataset from Configured Cameras

```bash
cd rl
python dataset_generator.py --use-config --model yolov8n.pt
```

This will:
1. Load all enabled cameras from `camera_config.json`
2. Connect to each RTSP stream using credentials
3. Process frames and generate vehicle counts
4. Save results to `datasets/cctv_counts_*.csv`

### Example 2: Use Config + Manual Sources

```bash
python dataset_generator.py \
  --use-config \
  --sources data/cctv/backup_video.mp4 \
  --stride 10
```

### Example 3: Python API Usage

```python
from camera_config_loader import get_config_manager

# Load configuration
config_mgr = get_config_manager()

# Get all enabled cameras
cameras = config_mgr.get_enabled_cameras()

# Get camera by ID
cam = config_mgr.get_camera("CAM-001")
if cam:
    url = cam.get_url()  # URL with credentials embedded
    print(f"Connecting to: {cam.name} at {url}")

# Get cameras for specific approach
north_cameras = config_mgr.get_cameras_by_approach("north")
```

## Common RTSP URL Formats

Different camera manufacturers use different RTSP URL formats:

### Hikvision
```
rtsp://username:password@ip:554/Streaming/Channels/101
```

### Dahua
```
rtsp://username:password@ip:554/cam/realmonitor?channel=1&subtype=0
```

### Axis
```
rtsp://username:password@ip:554/axis-media/media.amp
```

### Generic
```
rtsp://username:password@ip:554/stream1
```

Update the `path` field in your config accordingly.

## Troubleshooting

### Issue: Cannot connect to RTSP stream

**Solutions:**
1. Verify IP address and port are correct
2. Check network connectivity: `ping <camera_ip>`
3. Test RTSP URL with VLC: `vlc rtsp://...`
4. Verify credentials are correct
5. Check firewall settings
6. Ensure camera supports RTSP protocol

### Issue: Config file not found

**Solution:**
```bash
cd rl
cp camera_config.example.json camera_config.json
# Then edit camera_config.json with your credentials
```

### Issue: Credentials not working

**Solutions:**
1. URL-encode special characters in passwords
2. Check if camera requires different authentication method
3. Verify username/password in camera's web interface
4. Some cameras require admin privileges for RTSP

### Issue: Slow connection

**Solutions:**
1. Reduce frame stride: `--stride 10` (process every 10th frame)
2. Check network bandwidth
3. Reduce video resolution on camera
4. Use lower quality stream if available

## Testing Your Configuration

### Test Script

```python
from camera_config_loader import get_config_manager
import cv2

config_mgr = get_config_manager()
cameras = config_mgr.get_enabled_cameras()

for cam in cameras:
    print(f"Testing {cam.name} ({cam.id})...")
    url = cam.get_url()
    cap = cv2.VideoCapture(url)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret:
            print(f"  ✅ Successfully connected!")
        else:
            print(f"  ⚠️  Connected but no frame received")
        cap.release()
    else:
        print(f"  ❌ Failed to connect")
```

### Manual Test with VLC

1. Get the RTSP URL from config:
   ```python
   from camera_config_loader import get_config_manager
   cam = get_config_manager().get_camera("CAM-001")
   print(cam.get_url())
   ```

2. Test in VLC:
   - Open VLC
   - Media → Open Network Stream
   - Paste RTSP URL
   - Click Play

## Integration with Live Prediction

The live prediction API (`/api/predict`) can also use camera configs:

```python
# In monitoring_server.py or live_prediction_api.py
from camera_config_loader import get_config_manager

config_mgr = get_config_manager()
cam = config_mgr.get_camera(camera_id)
if cam:
    rtsp_url = cam.get_url()
    # Use rtsp_url for live stream processing
```

## Next Steps

1. **Create your config file**: Copy `camera_config.example.json` to `camera_config.json`
2. **Add your cameras**: Update with your RTSP credentials
3. **Test connection**: Use the test script or VLC
4. **Generate dataset**: Run `dataset_generator.py --use-config`
5. **Train model**: Use generated dataset for RL training

Your camera credentials are now configured! 🎥

