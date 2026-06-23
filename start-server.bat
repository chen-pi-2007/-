@echo off
title Gomoku Server
cd /d "%~dp0server"

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
echo Starting server on port 5000...
echo Keep this window open!
echo.
call npm start

pause
