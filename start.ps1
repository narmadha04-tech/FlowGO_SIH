# FlowGO Single Command Startup
# Usage: .\start.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   FlowGO Traffic AI" -ForegroundColor Green
Write-Host "   Single Command Startup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force | Out-Null

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) {
    $scriptDir = Get-Location
}

# Start Backend API
Write-Host "[1/2] Starting Backend API..." -ForegroundColor Yellow
$backendCmd = "cd '$scriptDir\rl'; python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Sleep -Seconds 2
Write-Host "  ✓ Backend starting at http://localhost:8000" -ForegroundColor Green

# Start Frontend Dashboard
Write-Host "[2/2] Starting Frontend Dashboard..." -ForegroundColor Yellow
$frontendCmd = "cd '$scriptDir\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Start-Sleep -Seconds 2
Write-Host "  ✓ Frontend starting at http://localhost:5173" -ForegroundColor Green

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
Write-Host "Two PowerShell windows have opened." -ForegroundColor Gray
Write-Host "Wait 10-20 seconds, then open http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit this window (services will keep running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
