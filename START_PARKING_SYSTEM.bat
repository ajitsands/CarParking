@echo off
title SaNDS Lab Parking Solution - Startup Launcher
color 0A
cls

echo ===============================================================================
echo                SaNDS Lab Smart Parking Management System
echo                  Automatic Multi-Service Local Launcher
echo ===============================================================================
echo.

:: Change directory to this script's folder
cd /d "%~dp0"

:: 1. Detect Local Network IP Address
echo [*] Detecting Local Network IPv4 Address...
for /f "tokens=4 delims= " %%a in ('route print 0.0.0.0 ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.*0.0.0.0.*0.0.0.0"') do (
    set LOCAL_IP=%%a
)
if "%LOCAL_IP%"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
        set LOCAL_IP=%%a
    )
)
:: Trim whitespace
for /f "tokens=* delims= " %%a in ("%LOCAL_IP%") do set LOCAL_IP=%%a

if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo [+] Detected Server IP: %LOCAL_IP%
echo.

:: 2. Check if MySQL is running (optional service start)
echo [*] Checking MySQL Database Service...
sc query MySQL80 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    net start MySQL80 >nul 2>&1
    echo [+] MySQL80 Windows service is running.
) else (
    sc query MySQL >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        net start MySQL >nul 2>&1
        echo [+] MySQL Windows service is running.
    ) else (
        echo [i] MySQL service check complete (or running via XAMPP / MariaDB).
    )
)
echo.

:: 3. Kill any lingering existing instances on port 8081 or 5173
echo [*] Freeing ports 8081 and 5173 if previously bound...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8081 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

:: 4. Start PHP Backend Server on 0.0.0.0:8081
echo [*] Starting PHP Backend API Server (Port 8081)...
start "SaNDS Parking - Backend API (Port 8081)" cmd /k "cd /d %~dp0 && php -S 0.0.0.0:8081 backend/public/index.php"
timeout /t 2 /nobreak >nul
echo [+] PHP Backend API Server running at: http://%LOCAL_IP%:8081
echo.

:: 5. Start Frontend Web Portal on 0.0.0.0:5173
echo [*] Starting Frontend Web Portal (Port 5173)...
start "SaNDS Parking - Frontend Portal (Port 5173)" cmd /k "cd /d %~dp0\frontend && npm run dev -- --host 0.0.0.0 --port 5173"
timeout /t 3 /nobreak >nul
echo [+] Frontend Web Portal running at: http://%LOCAL_IP%:5173
echo.

:: 6. Launch Browser to Admin Dashboard
echo [*] Opening Web Management Portal in default browser...
start http://localhost:5173

echo.
echo ===============================================================================
echo                           ALL SERVICES STARTED!
echo ===============================================================================
echo.
echo  [1] Admin & Cashier Portal:   http://localhost:5173
echo                                http://%LOCAL_IP%:5173
echo.
echo  [2] Mobile / Tablet Display:  http://%LOCAL_IP%:8081
echo      (In Android Display App, set Backend Server IP to: http://%LOCAL_IP%:8081)
echo.
echo  [3] Standalone APK Download:  http://%LOCAL_IP%:5173/downloads/ParkingDisplayBoard.apk
echo.
echo  [4] Default Credentials:
echo      - Admin:      admin / admin123
echo      - Superadmin: superadmin / admin123
echo      - Operator:   operator / operator123
echo.
echo ===============================================================================
echo  TIP: To start automatically when Windows boots:
echo       1. Press Win + R, type "shell:startup" and press Enter.
echo       2. Right-click this START_PARKING_SYSTEM.bat file -> Create Shortcut.
echo       3. Paste the shortcut into that Startup folder!
echo ===============================================================================
echo.
echo Press any key to minimize or close this launcher window (services keep running)...
pause >nul
