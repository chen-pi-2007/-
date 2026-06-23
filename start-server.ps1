# Gomoku Server Startup Script
Set-Location "$PSScriptRoot\server"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Starting server on port 5000..." -ForegroundColor Green
Write-Host "Keep this window open!" -ForegroundColor Yellow
Write-Host ""

npm start

Read-Host "Press Enter to exit"
