# 🚀 FlowGo Traffic AI - Complete Setup Instructions

## Quick Start (5 Minutes)

### Step 1: Install Dependencies

**Backend:**
```bash
cd rl
pip install -r requirements.txt
pip install python-jose[cryptography] python-multipart
```

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
```

### Step 2: Start the System

**Windows:**
```powershell
.\start_flowgo.ps1
```

**Linux/Mac:**
```bash
chmod +x start_flowgo.sh
./start_flowgo.sh
```

### Step 3: Access Dashboard

Open browser: **http://localhost:5173**

---

## Complete Setup Guide

### Prerequisites Installation

#### 1. Python 3.8+

**Windows:**
- Download from https://www.python.org/downloads/
- Check "Add Python to PATH" during installation
- Verify: `python --version`

**Linux:**
```bash
sudo apt update
sudo apt install python3 python3-pip
```

**Mac:**
```bash
brew install python3
```

#### 2. Node.js 18+

**Windows:**
- Download from https://nodejs.org/
- Install LTS version
- Verify: `node --version`

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Mac:**
```bash
brew install node
```

#### 3. SUMO (Optional - for RL training)

**Windows:**
1. Download from https://sumo.dlr.de/docs/Installing/index.html
2. Extract to `C:\sumo`
3. Set environment variable:
   ```powershell
   $env:SUMO_HOME = "C:\sumo"
   $env:PATH += ";C:\sumo\bin"
   ```

**Linux:**
```bash
sudo add-apt-repository ppa:sumo/stable
sudo apt update
sudo apt install sumo sumo-tools
export SUMO_HOME=/usr/share/sumo
```

**Mac:**
```bash
brew install sumo
export SUMO_HOME=/opt/homebrew/share/sumo
```

---

## Project Installation

### 1. Clone/Download Project

```bash
# If using git
git clone <repository-url>
cd SIH

# Or extract downloaded ZIP
# Navigate to SIH directory
```

### 2. Install Backend Dependencies

```bash
cd rl

# Install all Python packages
pip install -r requirements.txt

# Install authentication packages
pip install python-jose[cryptography] python-multipart

# Verify installation
python -c "import fastapi, uvicorn, cv2, ultralytics, stable_baselines3; print('All packages OK')"
```

### 3. Install Frontend Dependencies

```bash
cd frontend

# Install Node packages
npm install --legacy-peer-deps

# Verify installation
npm list --depth=0
```

### 4. Configure System (Optional)

**Camera Configuration:**
```bash
cd rl
cp camera_config.example.json camera_config.json
# Edit camera_config.json with your camera credentials
```

**Environment Variables:**
```bash
# frontend/.env (optional)
VITE_MONITORING_API=http://localhost:8000
```

---

## Running the System

### Option 1: Master Script (Recommended)

**Windows:**
```powershell
.\start_flowgo.ps1
```

**Linux/Mac:**
```bash
chmod +x start_flowgo.sh
./start_flowgo.sh
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd rl
python -m uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## First-Time Usage

### 1. Register Account

1. Open http://localhost:5173
2. Click "Access Control Room"
3. Click "Sign up"
4. Fill in:
   - Full Name
   - Authority ID (e.g., "AUTH-001")
   - Email (optional)
   - Password (min 6 characters)
5. Click "Create Account"
6. **Save the verification code** shown in the toast
7. Enter verification code
8. Click "Verify Account"

### 2. Login

1. Enter Authority ID and Password
2. Click "Sign In"
3. You'll be redirected to the dashboard

### 3. Explore Features

- **Overview**: System statistics
- **Live Map**: Traffic map with heat maps
- **Signal Management**: Control traffic signals
- **Analytics**: Performance charts
- **Green Corridor**: Emergency routes
- **Live Prediction**: Upload images for vehicle detection

---

## Testing the System

### Test Backend API

```bash
# Health check
curl http://localhost:8000/api/health

# Register user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"authority_id":"TEST-001","name":"Test User","password":"test123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"authority_id":"TEST-001","password":"test123"}'
```

### Test Frontend

1. Open http://localhost:5173
2. Verify homepage loads
3. Test login/register flow
4. Check dashboard loads after login

### Test Vehicle Detection

1. Go to "Live Prediction" in dashboard
2. Upload an image file
3. Verify detections appear

---

## Training RL Model (Optional)

### Prerequisites

- SUMO installed and configured
- Vehicle count dataset generated
- SUMO routes generated

### Steps

1. **Generate Dataset:**
```bash
cd rl
python dataset_generator.py --sources data/cctv/*.mp4
```

2. **Generate Routes:**
```bash
python generate_routes.py \
  --counts datasets/cctv_counts_*.csv \
  --output routes/city.rou.xml \
  --edges north=n2i:i2s east=e2i:i2w south=s2i:i2n west=w2i:i2e
```

3. **Train Model:**
```bash
python train_rl.py \
  --sumo-config nets/city.sumocfg \
  --route-file routes/city.rou.xml \
  --timesteps 200000
```

4. **Evaluate:**
```bash
python evaluate.py --model models/dqn_sumo.zip
```

---

## Verification

### Verify Requirements

```bash
cd rl
python verify_requirements.py
```

**Expected:** All 11 requirements satisfied ✅

### Verify Services

```bash
# Backend
curl http://localhost:8000/api/health

# Frontend
curl http://localhost:5173
```

---

## Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError`
**Solution:**
```bash
cd rl
pip install -r requirements.txt
```

**Problem:** `python-jose not found`
**Solution:**
```bash
pip install python-jose[cryptography]
```

**Problem:** Port 8000 in use
**Solution:**
```bash
# Change port in monitoring_server.py or kill process using port 8000
```

### Frontend Issues

**Problem:** `npm install` fails
**Solution:**
```bash
npm install --legacy-peer-deps
```

**Problem:** Port 5173 in use
**Solution:**
```bash
# Change port in vite.config.ts or kill process using port 5173
```

**Problem:** API connection errors
**Solution:**
- Verify backend is running
- Check `VITE_MONITORING_API` in `.env`
- Check CORS settings

### Authentication Issues

**Problem:** Login fails
**Solution:**
- Verify account is registered
- Check account is verified
- Verify password is correct

**Problem:** Token expired
**Solution:**
- Login again to get new token
- Tokens expire after 24 hours

---

## System Architecture

```
┌─────────────────────────────────────────┐
│         FlowGo Traffic AI              │
│      Developed by FlowGo Team          │
└─────────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐        ┌────▼────┐
│Backend │        │Frontend │
│(Python)│        │(React)  │
└───┬────┘        └────┬────┘
    │                  │
    └─────────┬────────┘
              │
    ┌─────────▼─────────┐
    │   RL Model (DQN)  │
    │   SUMO Simulation │
    └───────────────────┘
```

---

## Support

For issues or questions:
1. Check documentation files
2. Review troubleshooting section
3. Verify all dependencies installed
4. Check service logs in PowerShell/terminal windows

---

## Next Steps

1. ✅ System installed and running
2. ✅ Account registered and verified
3. ✅ Dashboard accessible
4. 🎯 Explore all features
5. 🎯 Train RL model (optional)
6. 🎯 Customize for your needs

---

**FlowGo Traffic AI - Ready to Use!** 🚀

*Developed by FlowGo Team*

