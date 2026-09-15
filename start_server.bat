@echo off
title FAFB LP Church Management System
cls
echo ========================================================
echo   FAFB LP Church Management System
echo ========================================================
echo.
echo [1/3] Initializing MySQL Database...
"C:\xampp\php\php.exe" api\setup.php
echo.
echo [2/3] Detecting correct Wi-Fi IP address...
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "((Get-NetIPAddress -InterfaceAlias '*Wi-Fi*','*Ethernet*' -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress) -notlike '169.254*' -notlike '127.*')[0]"`) do set IP=%%i

if "%IP%"=="" (
    set IP=10.0.1.148
)

echo.
echo ========================================================
echo   SERVER IS RUNNING!
echo.
echo   💻 On this PC:    http://localhost:8000/
echo   📱 On your Phone: http://%IP%:8000/
echo.
echo   * Both PC and Phone must be connected to the same Wi-Fi.
echo   * If your phone says "can't be reached", see the Firewall tip below.
echo   ========================================================
echo.
echo [3/3] Opening application on PC...
start http://localhost:8000/
"C:\xampp\php\php.exe" -S 0.0.0.0:8000
pause
