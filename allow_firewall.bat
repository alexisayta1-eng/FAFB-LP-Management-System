@echo off
title Allow FAFB Church App Through Windows Firewall
cls
echo ========================================================
echo   FAFB LP Church Management System - Firewall Fix
echo ========================================================
echo.
echo Checking Administrator privileges...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] ACTION NEEDED:
    echo Please right-click 'allow_firewall.bat' and select:
    echo        "Run as administrator"
    echo.
    pause
    exit /b
)

echo Adding Windows Firewall rule for Port 8000...
netsh advfirewall firewall delete rule name="FAFB Church System Port 8000" >nul 2>&1
netsh advfirewall firewall add rule name="FAFB Church System Port 8000" dir=in action=allow protocol=TCP localport=8000

echo.
echo ========================================================
echo   [SUCCESS] Port 8000 is now ALLOWED in Windows Firewall!
echo   Your phone can now connect to http://10.0.1.148:8000/
echo ========================================================
echo.
pause
