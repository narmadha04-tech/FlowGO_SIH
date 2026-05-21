@echo off
echo ========================================
echo   FlowGO Traffic AI - Single Command Start
echo ========================================
echo.

REM Set execution policy and start services
powershell -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd /d %~dp0rl && python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000'"
timeout /t 3 /nobreak >nul

powershell -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd /d %~dp0frontend && npm run dev'"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo Backend API: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Two PowerShell windows have opened.
echo Wait 10-20 seconds, then open http://localhost:5173
echo.
pause
