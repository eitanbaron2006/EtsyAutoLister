@echo off
chcp 65001 >nul
cd /d "%~dp0"
title EtsyAutoLister + WireMock Simulator

cls
echo ======================================================================
echo                EtsyAutoLister + WireMock Simulator
echo ======================================================================
echo.
echo  [*] Checking Java runtime for WireMock...
java -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [X] ERROR: Java was not found on your system!
    echo      Please install Java to run the WireMock Etsy simulator.
    echo.
    pause
    exit /b 1
)

echo  [OK] Java detected.
echo  [*] Starting WireMock (Port 8080) and EtsyAutoLister (Port 3000)...
echo.
echo ======================================================================
echo  Open in your browser:
echo    - Main App:    http://localhost:3000
echo    - Mock Store:  http://localhost:3000/mock-store
echo ======================================================================
echo  Press Ctrl+C at any time to stop both servers together.
echo ======================================================================
echo.

npm run dev:all
