# Simple FlowGO Startup Script
# Run this with: powershell -ExecutionPolicy Bypass -File .\start_services.ps1

Write-Host "Starting FlowGO Services..." -ForegroundColor Cyan
Write-Host ""

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force | Out-Null

# Get project root
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

# Start Backend API
Write-Host "[1/2] Starting Backend API..." -ForegroundColor Yellow
$backendScript = @"
cd `"$projectRoot\rl`"
python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000 --reload
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
Start-Sleep -Seconds 3
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Green

# Start Frontend Dashboard
Write-Host "[2/2] Starting Frontend Dashboard..." -ForegroundColor Yellow
$frontendScript = @"
cd `"$projectRoot\frontend`"
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript
Start-Sleep -Seconds 3
Write-Host "  Frontend Dashboard: http://localhost:5173" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Yellow
Write-Host "  • Homepage: http://localhost:5173" -ForegroundColor White
Write-Host "  • Authority Login: http://localhost:5173/authority/login" -ForegroundColor White
Write-Host "  • Public View: http://localhost:5173/public" -ForegroundColor White
Write-Host "  • API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Two PowerShell windows have opened with the services." -ForegroundColor Gray
Write-Host "Wait 10-20 seconds for services to fully start." -ForegroundColor Gray
Write-Host ""
