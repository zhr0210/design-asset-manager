@echo off
title Design Asset Manager Premium Suite
echo ===================================================
echo [1/2] Starting Python FastAPI AI Worker Service...
echo ===================================================
start "Python AI Worker" /min cmd /c "cd /d %~dp0 && python ai-service/app.py"
timeout /t 3 >nul

echo ===================================================
echo [2/2] Starting Electron React Desktop App (Auto-Restart Loop Active)...
echo ===================================================
powershell -Command "while ($true) { echo '==================================================='; echo 'Starting Electron React Desktop App...'; echo '==================================================='; npm run dev; echo '==================================================='; echo '[System] Electron app closed. Relaunching automatically in 2 seconds...'; echo '==================================================='; Start-Sleep -s 2 }"
