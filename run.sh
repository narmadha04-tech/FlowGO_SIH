#!/bin/bash
# ============================================
# FlowGo Traffic AI - Single Command Runner
# ============================================
# Run the entire project with one command:
#   ./run.sh
#
# This script will:
#   1. Check and install dependencies
#   2. Start Backend API (port 8000)
#   3. Start Frontend Dashboard (port 5173)
#   4. Open browser automatically
# ============================================

set -e

NO_BROWSER=false
SKIP_INSTALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-browser)
            NO_BROWSER=true
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --help|-h)
            echo ""
            echo "FlowGo Traffic AI - Single Command Runner"
            echo ""
            echo "Usage:"
            echo "  ./run.sh              # Run everything (default)"
            echo "  ./run.sh --no-browser   # Don't open browser"
            echo "  ./run.sh --skip-install # Skip dependency check"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo ""
echo "========================================"
echo "   FlowGo Traffic AI"
echo "   Single Command Startup"
echo "========================================"
echo ""

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check dependencies
echo "[1/5] Checking Dependencies..."

if [ "$SKIP_INSTALL" = false ]; then
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "  [ERROR] Python not found! Please install Python 3.8+"
        exit 1
    fi
    PYTHON_VERSION=$(python3 --version)
    echo "  [OK] Python: $PYTHON_VERSION"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "  [ERROR] Node.js not found! Please install Node.js 18+"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    echo "  [OK] Node.js: $NODE_VERSION"

    # Check Python packages
    echo ""
    echo "[2/5] Checking Python Packages..."
    cd "$PROJECT_ROOT/rl"
    
    if python3 -c "import fastapi, uvicorn, cv2, ultralytics, stable_baselines3" 2>/dev/null; then
        echo "  [OK] Core packages installed"
    else
        echo "  [WARN] Installing Python packages..."
        pip3 install -r requirements.txt --quiet
        echo "  [OK] Packages installed"
    fi

    # Check auth packages
    if python3 -c "import jose" 2>/dev/null; then
        echo "  [OK] Auth packages installed"
    else
        echo "  [WARN] Installing auth packages..."
        pip3 install python-jose[cryptography] python-multipart --quiet
        echo "  [OK] Auth packages installed"
    fi

    # Check Node packages
    echo ""
    echo "[3/5] Checking Node Packages..."
    cd "$PROJECT_ROOT/frontend"
    
    if [ ! -d "node_modules" ]; then
        echo "  [WARN] Installing Node packages..."
        npm install --legacy-peer-deps --silent
        echo "  [OK] Node packages installed"
    else
        echo "  [OK] Node packages installed"
    fi
else
    echo "  [SKIP] Dependency check skipped"
fi

# Start Backend API
echo ""
echo "[4/5] Starting Backend API..."
cd "$PROJECT_ROOT/rl"
python3 -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
sleep 3
echo "  [OK] Backend API starting at http://localhost:8000"

# Start Frontend Dashboard
echo ""
echo "[5/5] Starting Frontend Dashboard..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
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
else
    echo "  [WAIT] Backend API: Starting..."
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  [OK] Frontend Dashboard: Running"
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

# Open browser
if [ "$NO_BROWSER" = false ]; then
    echo "Opening browser..."
    sleep 2
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173" &
    elif command -v open &> /dev/null; then
        open "http://localhost:5173" &
    fi
fi

echo "========================================"
echo "FlowGo System Started!"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Shutting down FlowGo services...'; kill $API_PID $FRONTEND_PID 2>/dev/null; echo 'FlowGo services stopped.'; exit" INT TERM

wait

