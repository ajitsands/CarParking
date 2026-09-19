@echo off
title SaNDS Lab Smart Parking Management System - Central Controller
color 0B
cls

:: Change directory to this script's folder
cd /d "%~dp0"

echo ===============================================================================
echo                SaNDS Lab Smart Parking Management System
echo                       Unified System Controller
echo ===============================================================================
echo.

:: 1. Detect Local Network IP Address
echo [*] Detecting Local Network IPv4 Address...
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined LOCAL_IP set "LOCAL_IP=%%a"
)
if defined LOCAL_IP set "LOCAL_IP=%LOCAL_IP: =%"
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo [+] Detected Server IP: %LOCAL_IP%
echo.

:: 2. Terminate any previous instances on ports 8081, 5173, and 8889
echo [*] Checking and freeing ports 8081, 5173, and 8889...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8081,5173,8889 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

:: 3. Check MySQL Database Service
echo [*] Checking MySQL Database Service...
sc query MySQL80 >nul 2>&1
if %ERRORLEVEL% EQU 0 net start MySQL80 >nul 2>&1
sc query MySQL >nul 2>&1
if %ERRORLEVEL% EQU 0 net start MySQL >nul 2>&1
echo [+] MySQL check complete.
echo.

:: 4. Start Live RTSP Video Stream Bridge in Background (Hidden)
echo [*] Starting Live RTSP Stream Gateway (Port 8889)...
if exist "tools\mediamtx\mediamtx.exe" powershell -NoProfile -Command "Start-Process tools\mediamtx\mediamtx.exe -ArgumentList 'mediamtx.yml' -WorkingDirectory tools\mediamtx -WindowStyle Hidden" >nul 2>&1
if exist "tools\mediamtx\mediamtx.exe" echo [+] Stream Bridge running (Hidden Background).
if not exist "tools\mediamtx\mediamtx.exe" echo [i] Stream Gateway tool not installed (optional).

:: 5. Start PHP Backend Server in Background (Hidden)
echo [*] Starting PHP Backend API Server (Port 8081)...
powershell -NoProfile -Command "Start-Process php -ArgumentList '-S 0.0.0.0:8081 backend/public/index.php' -WindowStyle Hidden" >nul 2>&1
echo [+] PHP Backend running on port 8081 (Hidden Background).

:: 6. Start Frontend Web Server in Background (Hidden)
echo [*] Starting Frontend Web Portal (Port 5173)...
powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c npm run dev -- --host 0.0.0.0 --port 5173' -WorkingDirectory frontend -WindowStyle Hidden" >nul 2>&1
echo [+] Frontend Portal running on port 5173 (Hidden Background).

:: Wait 3 seconds for services to initialize
ping -n 4 127.0.0.1 >nul

:: 7. Launch Default Browser to Dashboard
start http://localhost:5173

:MENU
cls
echo ===============================================================================
echo                SaNDS Lab Smart Parking Management System
echo                   ONLINE AND RUNNING (SINGLE CONSOLE)
echo ===============================================================================
echo.
echo  [+] PHP Backend API:       http://localhost:8081  ^|  http://%LOCAL_IP%:8081
echo  [+] Web Dashboard UI:      http://localhost:5173  ^|  http://%LOCAL_IP%:5173
echo  [+] Display Board App:     http://%LOCAL_IP%:8081
echo.
echo -------------------------------------------------------------------------------
echo  ANPR CAMERA CONFIGURATION (Supports 1, 2, 4, or any number of cameras):
echo  - Set all LPR Cameras (UNV / Dahua / Hikvision) Server IP to: %LOCAL_IP%
echo  - Set Server Port to: 8081
echo  - Webhook URL / Push Path: /VIID/MotorVehicles or /api/v1/webhook/anpr
echo -------------------------------------------------------------------------------
echo.
echo  [1] Open Dashboard in Browser (http://localhost:5173)
echo  [2] Open Display Board in Browser (http://localhost:5173/display)
echo  [3] Open Camera Diagnostic Logs (anpr_incoming.log)
echo  [4] Restart All Services
echo  [Q] Stop All Services and Exit
echo.
echo ===============================================================================
set /p OPT="Enter your choice (1-4 or Q to stop): "

if /i "%OPT%"=="1" (
    start http://localhost:5173
    goto MENU
)
if /i "%OPT%"=="2" (
    start http://localhost:5173/display
    goto MENU
)
if /i "%OPT%"=="3" (
    if exist "backend\storage\logs\anpr_incoming.log" (
        start notepad "backend\storage\logs\anpr_incoming.log"
    ) else (
        echo Log file not created yet.
        pause
    )
    goto MENU
)
if /i "%OPT%"=="4" (
    echo [*] Restarting all services...
    call "%~dp0STOP_PARKING_SYSTEM.bat"
    goto :EOF
)
if /i "%OPT%"=="Q" (
    echo [*] Stopping all services...
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8081,5173,8889 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
    echo [+] All background services stopped successfully.
    timeout /t 2 >nul
    exit
)

goto MENU
