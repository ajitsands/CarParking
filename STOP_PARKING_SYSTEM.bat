@echo off
title SaNDS Lab Parking Solution - Stop Services
color 0C
cls

echo ===============================================================================
echo                SaNDS Lab Smart Parking Management System
echo                       Stop All Running Services
echo ===============================================================================
echo.

echo [*] Terminating all parking services (PHP 8081, Frontend 5173, Stream Bridge 8889)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8081,5173,8889 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [+] All background services have been stopped.
echo.
echo ===============================================================================
echo                           ALL SERVICES STOPPED
echo ===============================================================================
echo.
pause
