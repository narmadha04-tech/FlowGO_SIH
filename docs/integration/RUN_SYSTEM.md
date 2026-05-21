# 🚀 Running the Adaptive Traffic Control System

This guide provides step-by-step instructions with detailed comments for running the entire system.

## 📋 Prerequisites Check

Before running, ensure you have:

```bash
# 1. Python 3.8+ installed
python --version

# 2. Node.js 18+ installed
node --version

# 3. SUMO installed and SUMO_HOME set
echo $SUMO_HOME  # Linux/Mac
echo %SUMO_HOME% # Windows

# 4. All dependencies installed
cd rl
pip install -r requirements.txt

cd ../frontend
npm install --legacy-peer-deps
```

---

## 🎯 Quick Start (All-in-One)

### Windows (PowerShell)

```powershell
# Navigate to project root
cd D:\SIH

# Run the startup script (starts API + Frontend)
.\start_all.ps1
```

### Linux/Mac (Bash)

```bash
# Navigate to project root
cd /path/to/SIH

# Make script executable (first time only)
chmod +x start_all.sh

# Run the startup script
./start_all.sh
```

---

## 📝 Step-by-Step Manual Setup

### Step 1: Prepare Camera Configuration (Optional)

If you want to use live RTSP streams:

```bash
cd rl

# Copy example config
cp camera_config.example.json camera_config.json

# Edit camera_config.json with your camera credentials
# - Update IP addresses
# - Add username/password
# - Configure approach directions
```

**File**: `rl/camera_config.json`
```json
{
  "cameras": [
    {
      "id": "CAM-001",
      "type": "rtsp",
      "ip": "192.168.1.100",
      "port": 554,
      "credentials": {
        "username": "admin",
        "password": "your_password"
      }
    }
  ]
}
```

---

### Step 2: Generate Vehicle Count Dataset

**Purpose**: Process CCTV videos/RTSP streams to count vehicles using YOLOv8

```bash
cd rl

# Option A: Use configured cameras (from camera_config.json)
python dataset_generator.py --use-config --model yolov8n.pt

# Option B: Use local video files
python dataset_generator.py --sources data/cctv/*.mp4 --model yolov8n.pt

# Option C: Combine both
python dataset_generator.py --use-config --sources data/cctv/backup.mp4
```

**Parameters Explained**:
- `--use-config`: Load camera URLs from `camera_config.json`
- `--sources`: Specify video files or RTSP URLs manually
- `--model`: YOLOv8 model (yolov8n.pt = nano, fastest)
- `--stride 5`: Process every 5th frame (default, reduces processing time)
- `--conf 0.25`: Confidence threshold (25%, lower = more detections)

**Output**: `datasets/cctv_counts_YYYYMMDD_HHMMSS.csv`

---

### Step 3: Generate SUMO Route Files

**Purpose**: Convert vehicle counts into SUMO-compatible traffic routes

```bash
cd rl

# Generate routes from the latest dataset
python generate_routes.py \
  --counts datasets/cctv_counts_20250101_120000.csv \
  --output routes/city.rou.xml \
  --edges north=n2i:i2s east=e2i:i2w south=s2i:i2n west=w2i:i2e
```

**Parameters Explained**:
- `--counts`: Path to CSV file from Step 2
- `--output`: Where to save the route XML file
- `--edges`: Map approaches to SUMO edge IDs
  - Format: `approach=incoming_edge:outgoing_edge`
  - Example: `north=n2i:i2s` means north approach uses edge n2i→i2s

**Output**: `routes/city.rou.xml`

---

### Step 4: Start Monitoring API Server

**Purpose**: FastAPI server that serves metrics to the frontend dashboard

```bash
cd rl

# Start the server (with auto-reload for development)
python -m uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --reload
```

**What it does**:
- Serves `/api/metrics` - Dashboard data
- Serves `/api/health` - Health check
- Serves `/api/predict` - Live footage prediction
- Watches `artifacts/monitoring.json` for updates

**Access**:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs (Swagger UI)

**Keep this terminal open!**

---

### Step 5: Start Frontend Dashboard

**Purpose**: React dashboard for monitoring and control

```bash
cd frontend

# Start development server
npm run dev
```

**What it does**:
- Starts Vite dev server
- Hot-reloads on code changes
- Connects to API at http://localhost:8000

**Access**: http://localhost:5173

**Keep this terminal open!**

---

### Step 6: Train the RL Model (Optional)

**Purpose**: Train DQN agent to optimize traffic signals

```bash
cd rl

# Basic training (5,000 timesteps - quick test)
python train_rl.py \
  --sumo-config nets/city.sumocfg \
  --route-file routes/city.rou.xml \
  --timesteps 5000 \
  --log-dir artifacts/logs \
  --model-dir models

# Full training (200,000 timesteps - recommended)
python train_rl.py \
  --sumo-config nets/city.sumocfg \
  --route-file routes/city.rou.xml \
  --timesteps 200000 \
  --log-dir artifacts/logs \
  --model-dir models
```

**Parameters Explained**:
- `--sumo-config`: SUMO configuration file (defines network)
- `--route-file`: Route file from Step 3
- `--timesteps`: Number of training steps (more = better, but slower)
- `--log-dir`: Where to save TensorBoard logs
- `--model-dir`: Where to save trained model

**What happens**:
1. Starts SUMO simulation
2. DQN agent learns optimal signal timings
3. Saves model to `models/dqn_sumo.zip`
4. Updates `artifacts/monitoring.json` with metrics
5. Dashboard automatically shows training progress

**Output**:
- Model: `models/dqn_sumo.zip`
- Logs: `artifacts/logs/tb/` (view in TensorBoard)
- Metrics: `artifacts/monitoring.json`

---

### Step 7: Evaluate the Model (Optional)

**Purpose**: Test trained model and compare with baseline

```bash
cd rl

# Evaluate trained model
python evaluate.py \
  --model models/dqn_sumo.zip \
  --sumo-config nets/city.sumocfg \
  --route-file routes/city.rou.xml \
  --episodes 10
```

**What it does**:
- Loads trained model
- Runs simulation episodes
- Reports average waiting time, queue lengths, rewards
- Compares with baseline (fixed-time signals)

---

### Step 8: Demonstrate Improvement (Optional)

**Purpose**: Show 10% commute time reduction

```bash
cd rl

python demonstrate_improvement.py \
  --model models/dqn_sumo.zip \
  --sumo-config nets/city.sumocfg \
  --route-file routes/city.rou.xml \
  --episodes 5
```

**What it does**:
- Runs baseline evaluation (fixed-time signals)
- Runs AI-optimized evaluation (DQN agent)
- Calculates improvement percentage
- Verifies 10% reduction target

---

## 🔄 Complete Workflow Example

Here's a complete run-through with comments:

```bash
# ============================================
# COMPLETE SYSTEM RUN - WITH COMMENTS
# ============================================

# 1. Navigate to project
cd D:\SIH

# 2. Generate dataset from videos
cd rl
python dataset_generator.py --sources data/cctv/*.mp4 --model yolov8n.pt
# Output: datasets/cctv_counts_20250101_120000.csv

# 3. Generate SUMO routes
python generate_routes.py \
  --counts datasets/cctv_counts_20250101_120000.csv \
  --output routes/city.rou.xml \
  --edges north=n2i:i2s east=e2i:i2w south=s2i:i2n west=w2i:i2e
# Output: routes/city.rou.xml

# 4. Start API server (Terminal 1)
python -m uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --reload
# Keep running - serves dashboard data

# 5. Start frontend (Terminal 2)
cd ../frontend
npm run dev
# Keep running - serves web interface

# 6. Train model (Terminal 3)
cd ../rl
python train_rl.py \
  --sumo-config nets/city.sumocfg \
  --route-file routes/city.rou.xml \
  --timesteps 200000
# This will take time - model learns optimal timings

# 7. Access dashboard
# Open browser: http://localhost:5173
# View training progress, metrics, heat maps

# 8. Evaluate (after training completes)
python evaluate.py --model models/dqn_sumo.zip --sumo-config nets/city.sumocfg --route-file routes/city.rou.xml

# 9. Demonstrate improvement
python demonstrate_improvement.py \
  --model models/dqn_sumo.zip \
  --sumo-config nets/city.sumocfg \
  --route-file routes/city.rou.xml
```

---

## 🎮 Using the Dashboard

### Access Points

1. **Public View**: http://localhost:5173
   - Live traffic map
   - Signal status
   - No login required

2. **Authority Dashboard**: http://localhost:5173 (click "Authority Login")
   - Full control panel
   - Signal management
   - Live prediction
   - Analytics

### Dashboard Sections

- **Overview**: System statistics and health
- **Live Map**: Real-time traffic map with heat maps
- **Signal Management**: Control traffic signals (manual/auto)
- **Traffic Analytics**: Charts and trends
- **Green Corridor**: Emergency/VIP route management
- **Live Cameras**: Camera feed status
- **Live Prediction**: Upload images or stream webcam for vehicle detection

---

## 🐛 Troubleshooting

### Issue: SUMO not found

```bash
# Windows
set SUMO_HOME=C:\path\to\sumo
set PATH=%PATH%;%SUMO_HOME%\bin

# Linux/Mac
export SUMO_HOME=/path/to/sumo
export PATH=$PATH:$SUMO_HOME/bin
```

### Issue: Port already in use

```bash
# Change API port
python -m uvicorn monitoring_server:app --port 8001

# Change frontend port (edit frontend/vite.config.ts)
```

### Issue: Model training fails

```bash
# Check SUMO network exists
ls rl/nets/city.net.xml

# Check route file exists
ls rl/routes/city.rou.xml

# Verify SUMO config
cat rl/nets/city.sumocfg
```

### Issue: Camera connection fails

```bash
# Test RTSP URL with VLC
vlc rtsp://username:password@ip:554/stream1

# Check camera_config.json
cat rl/camera_config.json

# Test config loader
python -c "from camera_config_loader import get_config_manager; print(get_config_manager().get_all_urls())"
```

---

## 📊 Monitoring Training Progress

### TensorBoard

```bash
cd rl
tensorboard --logdir artifacts/logs/tb
# Open http://localhost:6006
```

### Dashboard Metrics

- Real-time updates in dashboard
- View at: http://localhost:5173
- Metrics refresh automatically

### Log Files

- Training logs: `artifacts/logs/`
- Monitoring data: `artifacts/monitoring.json`
- Model checkpoints: `models/`

---

## 🔐 Security Notes

1. **Camera Credentials**: Never commit `camera_config.json` to git
2. **API Access**: Default allows all origins (change for production)
3. **Model Files**: Can be large, use `.gitignore` if needed

---

## ✅ Verification Checklist

After running, verify:

- [ ] API server responds: http://localhost:8000/api/health
- [ ] Frontend loads: http://localhost:5173
- [ ] Dataset generated: `datasets/cctv_counts_*.csv` exists
- [ ] Routes generated: `routes/city.rou.xml` exists
- [ ] Model trained: `models/dqn_sumo.zip` exists
- [ ] Monitoring data: `artifacts/monitoring.json` exists
- [ ] Dashboard shows data: Metrics visible in UI

---

## 🚀 Production Deployment

For production:

1. **Build frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Use production server**:
   ```bash
   cd rl
   uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --workers 4
   ```

3. **Serve frontend**:
   ```bash
   # Use nginx, Apache, or similar
   # Serve frontend/dist directory
   ```

4. **Set environment variables**:
   ```bash
   export MONITORING_API_URL=https://api.yoursite.com
   ```

---

## 📚 Additional Resources

- **Camera Setup**: `rl/CAMERA_CREDENTIALS_GUIDE.md`
- **Backend API**: `rl/BACKEND_SETUP.md`
- **Integration**: `INTEGRATION_GUIDE.md`
- **Problem Solution**: `PROBLEM_SOLUTION_ALIGNMENT.md`

---

## 💡 Tips

1. **Start small**: Use `--timesteps 5000` for quick testing
2. **Monitor resources**: Training uses CPU/GPU, check system load
3. **Save checkpoints**: Models are saved during training
4. **Use TensorBoard**: Visualize training progress
5. **Test incrementally**: Verify each step before moving to next

---

**Happy Running! 🚦**

