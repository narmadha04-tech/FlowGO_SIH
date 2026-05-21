# FlowGo Traffic AI - Startup Scripts

This directory contains all startup scripts for the FlowGo Traffic AI system.

## 🚀 Available Scripts

### Master Startup Scripts (Recommended)

#### Windows
```powershell
.\scripts\start_flowgo.ps1
```
- Starts Backend API (port 8000)
- Starts Frontend Dashboard (port 5173)
- Checks dependencies
- Verifies services

#### Linux/Mac
```bash
chmod +x scripts/start_flowgo.sh
./scripts/start_flowgo.sh
```

### Alternative Scripts

#### Windows
```powershell
.\scripts\start_all.ps1
```

#### Linux/Mac
```bash
chmod +x scripts/start_all.sh
./scripts/start_all.sh
```

## 📋 What the Scripts Do

1. **Check Dependencies**
   - Python 3.8+
   - Node.js 18+
   - Required packages

2. **Install Missing Packages**
   - Python: `pip install -r requirements.txt`
   - Node: `npm install --legacy-peer-deps`

3. **Start Services**
   - Backend API server
   - Frontend development server

4. **Verify Services**
   - Health checks
   - Service status

## 🔧 Manual Startup

If you prefer manual startup:

**Terminal 1 - Backend:**
```bash
cd rl
python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 📝 Notes

- Scripts automatically check and install dependencies
- Services start in separate windows/terminals
- Press Ctrl+C to stop all services

---

**FlowGo Team** - AI-Powered Traffic Management

