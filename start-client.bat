@echo off
title Gomoku Client
cd /d "%~dp0client"

if not exist "node_modules\" (
    echo Installing dependencies...
    echo This may take a few minutes...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting client on port 3001...
echo Make sure server is running first!
echo.
echo Open browser: http://localhost:3001
echo.
timeout /t 2 /nobreak >nul

call npm start

pause
