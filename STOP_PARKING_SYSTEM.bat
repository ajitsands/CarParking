@echo off
title SaNDS Lab Parking Solution - Stop Services
color 0C
cls

echo ===============================================================================
echo                SaNDS Lab Smart Parking Management System
echo                       Stop All Running Services
echo ===============================================================================
echo.

echo [*] Terminating Backend PHP Server (Port 8081)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8081 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    echo [+] Terminated PID: %%a (Port 8081)
)

echo [*] Terminating Frontend Web Portal (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    echo [+] Terminated PID: %%a (Port 5173)
)

echo.
echo ===============================================================================
echo                           ALL SERVICES STOPPED
echo ===============================================================================
echo.
pause
