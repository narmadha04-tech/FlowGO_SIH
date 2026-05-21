#!/bin/bash
# ============================================
# FlowGo Traffic AI - Master Startup Script
# ============================================
# Complete startup script for the entire FlowGo system

echo ""
echo "========================================"
echo "   FlowGo Traffic AI System"
echo "   AI-Powered Traffic Management"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -d "rl" ]; then
    echo "[ERROR] Please run this script from the project root (SIH directory)"
    exit 1
fi

# Check dependencies
echo "[1/4] Checking Dependencies..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "  [OK] Python: $PYTHON_VERSION"
else
    echo "  [FAIL] Python not found!"
    exit 1
fi

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  [OK] Node.js: $NODE_VERSION"
else
    echo "  [FAIL] Node.js not found!"
    exit 1
fi

# Check Python packages
echo ""
echo "[2/4] Checking Python Packages..."
cd rl
if python3 -c "import fastapi, uvicorn, cv2, ultralytics, stable_baselines3" 2>/dev/null; then
    echo "  [OK] Python packages installed"
else
    echo "  [WARN] Installing packages..."
    pip3 install -r requirements.txt --quiet
    echo "  [OK] Packages installed"
fi

# Check auth packages
if python3 -c "import jose" 2>/dev/null; then
    echo "  [OK] Authentication packages installed"
else
    echo "  [WARN] Installing authentication packages..."
    pip3 install python-jose[cryptography] python-multipart --quiet
    echo "  [OK] Auth packages installed"
fi
cd ..

# Start Backend API Server
echo ""
echo "[3/4] Starting FlowGo Backend API..."
cd rl
python3 -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
cd ..
sleep 3
echo "  [OK] Backend API starting at http://localhost:8000"

# Start Frontend Dashboard
echo ""
echo "[4/4] Starting FlowGo Frontend Dashboard..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
sleep 5
echo "  [OK] Frontend Dashboard starting at http://localhost:5173"

# Wait for services
echo ""
echo "Waiting for services to initialize..."
sleep 5

# Verify services
echo ""
echo "========================================"
echo "FlowGo System Status"
echo "========================================"
echo ""

if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "  [OK] Backend API: Running"
    echo "      URL: http://localhost:8000"
    echo "      Docs: http://localhost:8000/docs"
else
    echo "  [WAIT] Backend API: Starting..."
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  [OK] Frontend Dashboard: Running"
    echo "      URL: http://localhost:5173"
else
    echo "  [WAIT] Frontend Dashboard: Starting..."
fi

echo ""
echo "========================================"
echo "Access Points"
echo "========================================"
echo "  Homepage: http://localhost:5173"
echo "  Authority Login: http://localhost:5173/authority/login"
echo "  Public View: http://localhost:5173/public"
echo "  API Docs: http://localhost:8000/docs"
echo ""

echo "========================================"
echo "FlowGo Features"
echo "========================================"
echo "  - AI-Powered Signal Optimization"
echo "  - Real-Time Vehicle Detection (YOLOv8)"
echo "  - Live Traffic Heat Maps"
echo "  - Signal Management Dashboard"
echo "  - Green Corridor Control"
echo "  - Live Footage Prediction"
echo "  - IoT Sensor Integration"
echo ""

echo "========================================"
echo "FlowGo System Started Successfully!"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Shutting down FlowGo services...'; kill $API_PID $FRONTEND_PID 2>/dev/null; echo 'FlowGo services stopped.'; exit" INT TERM

wait

