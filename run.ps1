# ============================================
# FlowGo Traffic AI - Single Command Runner
# ============================================
# Run the entire project with one command:
#   .\run.ps1
#
# This script will:
#   1. Check and install dependencies
#   2. Start Backend API (port 8000)
#   3. Start Frontend Dashboard (port 5173)
#   4. Open browser automatically
# ============================================

param(
    [switch]$NoBrowser,
    [switch]$SkipInstall,
    [switch]$Help
)

if ($Help) {
    Write-Host ""
    Write-Host "FlowGo Traffic AI - Single Command Runner" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\run.ps1              # Run everything (default)" -ForegroundColor White
    Write-Host "  .\run.ps1 -NoBrowser   # Don't open browser" -ForegroundColor White
    Write-Host "  .\run.ps1 -SkipInstall # Skip dependency check" -ForegroundColor White
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   FlowGo Traffic AI" -ForegroundColor Green
Write-Host "   Single Command Startup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force | Out-Null

# Get project root
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

# Add Python to PATH if needed
$pythonPath = "C:\Users\janavanth\AppData\Local\Programs\Python\Python313"
if (Test-Path $pythonPath) {
    $env:PATH += ";$pythonPath;$pythonPath\Scripts"
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check dependencies
Write-Host "[1/5] Checking Dependencies..." -ForegroundColor Yellow

if (-not $SkipInstall) {
    # Check Python
    if (-not (Test-Command "python")) {
        Write-Host "  [ERROR] Python not found! Please install Python 3.8+" -ForegroundColor Red
        exit 1
    }
    $pythonVersion = python --version 2>&1
    Write-Host "  [OK] Python: $pythonVersion" -ForegroundColor Green

    # Check Node.js
    if (-not (Test-Command "node")) {
        Write-Host "  [ERROR] Node.js not found! Please install Node.js 18+" -ForegroundColor Red
        exit 1
    }
    $nodeVersion = node --version 2>&1
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green

    # Check Python packages
    Write-Host ""
    Write-Host "[2/5] Checking Python Packages..." -ForegroundColor Yellow
    $rlDir = Join-Path $projectRoot "rl"
    Push-Location $rlDir
    
    try {
        python -c "import fastapi, uvicorn, cv2, ultralytics, stable_baselines3" 2>&1 | Out-Null
        Write-Host "  [OK] Core packages installed" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Installing Python packages..." -ForegroundColor Yellow
        pip install -r requirements.txt --quiet
        Write-Host "  [OK] Packages installed" -ForegroundColor Green
    }

    # Check auth packages
    try {
        python -c "import jose" 2>&1 | Out-Null
        Write-Host "  [OK] Auth packages installed" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Installing auth packages..." -ForegroundColor Yellow
        pip install python-jose[cryptography] python-multipart --quiet
        Write-Host "  [OK] Auth packages installed" -ForegroundColor Green
    }
    
    Pop-Location

    # Check Node packages
    Write-Host ""
    Write-Host "[3/5] Checking Node Packages..." -ForegroundColor Yellow
    $frontendDir = Join-Path $projectRoot "frontend"
    Push-Location $frontendDir
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "  [WARN] Installing Node packages..." -ForegroundColor Yellow
        npm install --legacy-peer-deps --silent
        Write-Host "  [OK] Node packages installed" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Node packages installed" -ForegroundColor Green
    }
    
    Pop-Location
} else {
    Write-Host "  [SKIP] Dependency check skipped" -ForegroundColor Yellow
}

# Start Backend API
Write-Host ""
Write-Host "[4/5] Starting Backend API..." -ForegroundColor Yellow
$apiScript = @"
cd `"$rlDir`"
`$env:PATH += ';$pythonPath;$pythonPath\Scripts'
Write-Host 'FlowGo Backend API' -ForegroundColor Cyan
Write-Host '==================' -ForegroundColor Cyan
python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000 --reload
"@

$apiProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $apiScript -WindowStyle Minimized -PassThru
Start-Sleep -Seconds 3
Write-Host "  [OK] Backend API starting at http://localhost:8000" -ForegroundColor Green

# Start Frontend Dashboard
Write-Host ""
Write-Host "[5/5] Starting Frontend Dashboard..." -ForegroundColor Yellow
$frontendScript = @"
cd `"$frontendDir`"
Write-Host 'FlowGo Frontend Dashboard' -ForegroundColor Cyan
Write-Host '========================' -ForegroundColor Cyan
npm run dev
"@

$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript -WindowStyle Minimized -PassThru
Start-Sleep -Seconds 5
Write-Host "  [OK] Frontend Dashboard starting at http://localhost:5173" -ForegroundColor Green

# Wait for services
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
    }
} catch {
    Write-Host "  [WAIT] Backend API: Starting..." -ForegroundColor Yellow
}

try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($frontendCheck.StatusCode -eq 200) {
        $frontendReady = $true
        Write-Host "  [OK] Frontend Dashboard: Running" -ForegroundColor Green
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
Write-Host ""

# Open browser
if (-not $NoBrowser) {
    Write-Host "Opening browser..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5173"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FlowGo System Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services are running in minimized windows." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Keep script running and handle cleanup
try {
    while ($true) {
        Start-Sleep -Seconds 10
    }
} finally {
    Write-Host "`nShutting down FlowGo services..." -ForegroundColor Yellow
    if ($apiProcess) { 
        Stop-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue 
    }
    if ($frontendProcess) { 
        Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue 
    }
    Write-Host "FlowGo services stopped." -ForegroundColor Green
}

