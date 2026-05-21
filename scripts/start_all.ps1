# PowerShell script to start the complete adaptive traffic system
# Usage: .\start_all.ps1

Write-Host "=== Adaptive Traffic Control System ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "rl")) {
    Write-Host "[ERROR] Please run this script from the project root (SIH directory)" -ForegroundColor Red
    exit 1
}

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Step 1: Start monitoring server
Write-Host "[1/3] Starting monitoring API server..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    cd rl
    python -m uvicorn monitoring_server:app --host 0.0.0.0 --port 8000 --reload
}

Start-Sleep -Seconds 3
Write-Host "       Server started at http://localhost:8000" -ForegroundColor Green

# Step 2: Start frontend
Write-Host "[2/3] Starting frontend development server..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    cd frontend
    npm run dev
}

Start-Sleep -Seconds 5
Write-Host "       Frontend should be available at http://localhost:5173" -ForegroundColor Green

# Step 3: Instructions
Write-Host "[3/3] System Status" -ForegroundColor Yellow
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  - Monitoring API: http://localhost:8000/api/metrics" -ForegroundColor White
Write-Host "  - Frontend Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "To start RL training, run:" -ForegroundColor Cyan
Write-Host "  cd rl" -ForegroundColor White
Write-Host "  python train_rl.py --sumo-config nets/city.sumocfg --route-file routes/city.rou.xml --timesteps 200000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

try {
    # Wait for user interrupt
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nShutting down services..." -ForegroundColor Yellow
    Stop-Job $serverJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "All services stopped." -ForegroundColor Green
}

