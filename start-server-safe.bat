@echo off
title Gomoku Server (Safe Start)
cd /d "%~dp0server"

echo ========================================
echo   Starting Server (Port 5000)
echo ========================================
echo.

echo [Step 1] Checking port 5000...
netstat -ano | findstr :5000 >nul
if %errorlevel% == 0 (
    echo Port 5000 is in use. Closing old processes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
        echo Closing process ID: %%a
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
    echo Port 5000 cleared.
) else (
    echo Port 5000 is available.
)

echo.
echo [Step 2] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo [Step 3] Starting server...
echo Server will run on: http://localhost:5000
echo Keep this window open!
echo.
echo ========================================
echo.

call npm start

pause
