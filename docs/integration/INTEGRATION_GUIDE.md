oot
# System Integration Guide

This guide explains how all components of the Adaptive Traffic Control System are interconnected.

## 🔗 Component Connections

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA COLLECTION LAYER                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   YOLOv8 Vehicle Detection       │
        │   (dataset_generator.py)          │
        └───────────────┬───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   CSV: cctv_counts_*.csv           │
        │   (Vehicle counts per approach)    │
        └───────────────┬───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   SUMO Route Generation           │
        │   (generate_routes.py)             │
        └───────────────┬───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   XML: routes/city.rou.xml        │
        │   (SUMO-compatible traffic flows)  │
        └───────────────┬───────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    RL TRAINING LAYER                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   SUMO Environment                 │
        │   (data_collector_env.py)          │
        │   - Collects lane metrics          │
        │   - Generates heatmap data         │
        │   - Computes rewards               │
        └───────────────┬───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   DQN Agent                        │
        │   (train_rl.py)                    │
        │   - Learns optimal signal timing   │
        │   - Writes monitoring.json         │
        │   - Updates heatmap.json           │
        └───────────────┬───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   Artifacts:                       │
        │   - models/dqn_sumo.zip            │
        │   - artifacts/monitoring.json      │
        │   - artifacts/logs/heatmap.json     │
        │   - artifacts/logs/transitions.csv │
        └───────────────┬───────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    API LAYER                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   FastAPI Monitoring Server        │
        │   (monitoring_server.py)           │
        │   - Reads monitoring.json          │
        │   - Reads heatmap.json             │
        │   - Serves /api/metrics             │
        │   - CORS enabled for frontend       │
        └───────────────┬───────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   HTTP REST API                    │
        │   http://localhost:8000/api/metrics│
        │   - JSON payload with all metrics  │
        │   - Updates every 5 seconds       │
        └───────────────┬───────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   React Dashboard                  │
        │   (frontend/src/)                   │
        │   - useMonitoringData hook          │
        │   - Polls API every 5 seconds       │
        │   - Displays heat maps              │
        │   - Shows real-time metrics         │
        └───────────────────────────────────┘
```

## 🔌 Connection Points

### 1. Dataset → Routes
**Connection:** `generate_routes.py` reads CSV from `dataset_generator.py`
```python
# Input: datasets/cctv_counts_YYYYMMDD_HHMMSS.csv
# Output: routes/city.rou.xml
python generate_routes.py --counts <csv_file> --output routes/city.rou.xml
```

### 2. Routes → RL Training
**Connection:** `train_rl.py` uses route file in SUMO environment
```python
# data_collector_env.py loads route file via SUMO config
env = SumoTrafficEnv(
    sumo_config="nets/city.sumocfg",  # References route file
    route_file="routes/city.rou.xml"
)
```

### 3. RL Training → Monitoring Data
**Connection:** Training writes JSON files that API reads
```python
# train_rl.py writes:
monitoring_path.write_text(json.dumps(report))  # artifacts/monitoring.json

# data_collector_env.py writes:
logger.update_heatmap(lane_data)  # artifacts/logs/heatmap.json
```

### 4. Monitoring API → Frontend
**Connection:** React hook polls FastAPI endpoint
```typescript
// frontend/src/hooks/useMonitoringData.ts
const { data } = useQuery({
  queryFn: () => fetch(`${API_BASE}/api/metrics`),
  refetchInterval: 5000  // Every 5 seconds
});
```

### 5. Heat Map Data Flow
**Connection:** Complete pipeline from SUMO to visualization
```
SUMO Lane Metrics → ExperienceLogger → heatmap.json → API → Frontend → Leaflet Heat Layer
```

## 🚀 Starting the Complete System

### Option 1: Automated (Recommended)

**Windows:**
```powershell
.\start_all.ps1
```

**Linux/Mac:**
```bash
chmod +x start_all.sh
./start_all.sh
```

### Option 2: Manual (3 Terminals)

**Terminal 1 - Monitoring API:**
```bash
cd rl
python -m uvicorn monitoring_server:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - RL Training:**
```bash
cd rl
python train_rl.py --sumo-config nets/city.sumocfg --route-file routes/city.rou.xml --timesteps 200000
```

## 📡 API Endpoints

### GET `/api/metrics`
Returns complete monitoring payload including:
- Stats (signals, incidents, corridors)
- Recent events
- Signal statuses
- Traffic analytics
- Training metrics
- Map data (signals, corridors, vehicles)
- **Heat map data** (lanes with congestion levels)

### POST `/api/metrics`
Updates monitoring payload (used by training script)

### GET `/api/health`
Health check endpoint

## 🔄 Real-Time Updates

1. **Training Loop:** Every 10 steps, heatmap data is written
2. **API Polling:** Frontend polls API every 5 seconds
3. **Heat Map:** Updates automatically when new data arrives
4. **Metrics:** All dashboard metrics refresh in real-time

## 🛠️ Troubleshooting Connections

### API Not Responding
```bash
# Check if server is running
curl http://localhost:8000/api/health

# Check logs
cd rl
python -m uvicorn monitoring_server:app --reload --port 8000
```

### Frontend Can't Connect
1. Verify API URL in `frontend/src/lib/api.ts`
2. Check CORS settings in `monitoring_server.py`
3. Ensure API is running on port 8000

### Heat Map Not Showing
1. Check if `artifacts/logs/heatmap.json` exists
2. Verify training has run for at least 10 steps
3. Check browser console for errors
4. Verify `leaflet.heat` is installed

### Training Not Writing Data
1. Check `artifacts/logs/` directory exists
2. Verify write permissions
3. Check training logs for errors
4. Ensure SUMO is properly configured

## 📊 Data Structure

### monitoring.json
```json
{
  "stats": {...},
  "signals": [...],
  "training": {
    "avg_wait_ai": 26.4,
    "improvement_pct": 0.37
  },
  "heatmap": {
    "lanes": [
      {
        "lane_id": "north_0",
        "position": [28.6139, 77.2090],
        "congestion": 0.65,
        "halting": 5,
        "occupancy": 45.2,
        "speed": 12.5,
        "approach": "north"
      }
    ],
    "updated_at": 1234567890
  }
}
```

### heatmap.json
```json
{
  "lanes": [
    {
      "lane_id": "string",
      "position": [lat, lon],
      "congestion": 0.0-1.0,
      "halting": int,
      "occupancy": float,
      "speed": float,
      "approach": "string"
    }
  ],
  "updated_at": timestamp
}
```

## ✅ Verification Checklist

- [ ] Monitoring server starts on port 8000
- [ ] Frontend connects to API (check Network tab)
- [ ] Training writes `monitoring.json`
- [ ] Training writes `heatmap.json`
- [ ] Heat map appears on dashboard
- [ ] Metrics update in real-time
- [ ] No CORS errors in browser console
- [ ] All API endpoints respond correctly

## 🎯 Next Steps

1. **Start Training:** Run training to generate heat map data
2. **Monitor Dashboard:** Watch real-time updates
3. **Analyze Patterns:** Use heat maps to identify bottlenecks
4. **Tune Parameters:** Adjust reward weights based on insights
5. **Evaluate:** Compare AI vs baseline performance

---

**All components are now fully interconnected and ready to use!**

