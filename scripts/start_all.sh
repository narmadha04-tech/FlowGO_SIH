#!/bin/bash
# Bash script to start the complete adaptive traffic system
# Usage: ./start_all.sh

echo "=== Adaptive Traffic Control System ==="
echo ""

# Check if we're in the right directory
if [ ! -d "rl" ]; then
    echo "[ERROR] Please run this script from the project root (SIH directory)"
    exit 1
fi

# Step 1: Start monitoring server
echo "[1/3] Starting monitoring API server..."
cd rl
python -m uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --reload &
SERVER_PID=$!
cd ..
sleep 3
echo "       Server started at http://localhost:8000"

# Step 2: Start frontend
echo "[2/3] Starting frontend development server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
sleep 5
echo "       Frontend should be available at http://localhost:5173"

# Step 3: Instructions
echo "[3/3] System Status"
echo ""
echo "Services running:"
echo "  - Monitoring API: http://localhost:8000/api/metrics"
echo "  - Frontend Dashboard: http://localhost:5173"
echo ""
echo "To start RL training, run:"
echo "  cd rl"
echo "  python train_rl.py --sumo-config nets/city.sumocfg --route-file routes/city.rou.xml --timesteps 200000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $SERVER_PID $FRONTEND_PID 2>/dev/null
    wait $SERVER_PID $FRONTEND_PID 2>/dev/null
    echo "All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user interrupt
wait

