# ============================================
# FlowGo Traffic AI - Master Startup Script
# ============================================
# Complete startup script for the entire FlowGo system
# Starts: Backend API, Frontend Dashboard, and provides RL training instructions

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   FlowGo Traffic AI System" -ForegroundColor Green
Write-Host "   AI-Powered Traffic Management" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "rl")) {
    Write-Host "[ERROR] Please run this script from the project root (SIH directory)" -ForegroundColor Red
    exit 1
}

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Add Python to PATH if needed
$pythonPath = "C:\Users\janavanth\AppData\Local\Programs\Python\Python313"
if (Test-Path $pythonPath) {
    $env:PATH += ";$pythonPath;$pythonPath\Scripts"
}

# Check dependencies
Write-Host "[1/4] Checking Dependencies..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  [OK] Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Python not found!" -ForegroundColor Red
    exit 1
}

try {
    $nodeVersion = node --version 2>&1
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Node.js not found!" -ForegroundColor Red
    exit 1
}

# Check if dependencies are installed
Write-Host ""
Write-Host "[2/4] Checking Python Packages..." -ForegroundColor Yellow
cd rl
try {
    python -c "import fastapi, uvicorn, cv2, ultralytics, stable_baselines3" 2>&1 | Out-Null
    Write-Host "  [OK] Python packages installed" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Some packages missing. Installing..." -ForegroundColor Yellow
    pip install -r requirements.txt --quiet
    Write-Host "  [OK] Packages installed" -ForegroundColor Green
}

# Check if python-jose is installed (for auth)
try {
    python -c "import jose" 2>&1 | Out-Null
    Write-Host "  [OK] Authentication packages installed" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Installing authentication packages..." -ForegroundColor Yellow
    pip install python-jose[cryptography] python-multipart --quiet
    Write-Host "  [OK] Auth packages installed" -ForegroundColor Green
}

cd ..

# Start Backend API Server
Write-Host ""
Write-Host "[3/4] Starting FlowGo Backend API..." -ForegroundColor Yellow
$apiProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\SIH\rl; `$env:PATH += ';$pythonPath;$pythonPath\Scripts'; Write-Host 'FlowGo Backend API Server' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal -PassThru
Start-Sleep -Seconds 3
Write-Host "  [OK] Backend API starting at http://localhost:8000" -ForegroundColor Green

# Start Frontend Dashboard
Write-Host ""
Write-Host "[4/4] Starting FlowGo Frontend Dashboard..." -ForegroundColor Yellow
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\SIH\frontend; Write-Host 'FlowGo Frontend Dashboard' -ForegroundColor Cyan; Write-Host '================================' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal -PassThru
Start-Sleep -Seconds 5
Write-Host "  [OK] Frontend Dashboard starting at http://localhost:5173" -ForegroundColor Green

# Wait for services to be ready
Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verify services
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FlowGo System Status" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiReady = $false
$frontendReady = $false

try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($healthCheck.StatusCode -eq 200) {
        $apiReady = $true
        Write-Host "  [OK] Backend API: Running" -ForegroundColor Green
        Write-Host "      URL: http://localhost:8000" -ForegroundColor Gray
        Write-Host "      Docs: http://localhost:8000/docs" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [WAIT] Backend API: Starting..." -ForegroundColor Yellow
}

try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($frontendCheck.StatusCode -eq 200) {
        $frontendReady = $true
        Write-Host "  [OK] Frontend Dashboard: Running" -ForegroundColor Green
        Write-Host "      URL: http://localhost:5173" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [WAIT] Frontend Dashboard: Starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Access Points" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Homepage: http://localhost:5173" -ForegroundColor White
Write-Host "  Authority Login: http://localhost:5173/authority/login" -ForegroundColor White
Write-Host "  Public View: http://localhost:5173/public" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  API Health: http://localhost:8000/api/health" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FlowGo Features" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  - AI-Powered Signal Optimization" -ForegroundColor White
Write-Host "  - Real-Time Vehicle Detection (YOLOv8)" -ForegroundColor White
Write-Host "  - Live Traffic Heat Maps" -ForegroundColor White
Write-Host "  - Signal Management Dashboard" -ForegroundColor White
Write-Host "  - Green Corridor Control" -ForegroundColor White
Write-Host "  - Live Footage Prediction" -ForegroundColor White
Write-Host "  - IoT Sensor Integration" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host "2. Register/Login to access Authority Dashboard" -ForegroundColor White
Write-Host "3. Navigate to 'Live Prediction' for vehicle detection" -ForegroundColor White
Write-Host "4. Check PowerShell windows for service logs" -ForegroundColor White
Write-Host ""

Write-Host "Optional - Train RL Model:" -ForegroundColor Cyan
Write-Host "  cd rl" -ForegroundColor Gray
Write-Host "  python train_rl.py --sumo-config nets/city.sumocfg --route-file routes/city.rou.xml --timesteps 200000" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FlowGo System Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 10
    }
} finally {
    Write-Host "`nShutting down FlowGo services..." -ForegroundColor Yellow
    if ($apiProcess) { Stop-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue }
    if ($frontendProcess) { Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue }
    Write-Host "FlowGo services stopped." -ForegroundColor Green
}

