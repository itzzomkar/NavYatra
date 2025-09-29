# Backend Authentication System - Complete Startup Script
# This script starts all required services

Write-Host "🚀 Starting Backend Authentication System..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan

# Step 1: Check if MongoDB is running
Write-Host "`n1. Checking MongoDB status..." -ForegroundColor Yellow
$mongoProcess = Get-Process mongod -ErrorAction SilentlyContinue

if ($mongoProcess) {
    Write-Host "   ✅ MongoDB is already running (PID: $($mongoProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   🔄 Starting MongoDB..." -ForegroundColor Yellow
    try {
        # Try to start as Windows service first
        Start-Service MongoDB -ErrorAction Stop
        Write-Host "   ✅ MongoDB service started successfully" -ForegroundColor Green
    } catch {
        # If service doesn't exist, start manually
        Write-Host "   🔄 Starting MongoDB manually..." -ForegroundColor Yellow
        Start-Process -WindowStyle Hidden mongod
        Start-Sleep -Seconds 3
        Write-Host "   ✅ MongoDB started manually" -ForegroundColor Green
    }
}

# Step 2: Verify Node.js and npm
Write-Host "`n2. Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "   ✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Step 3: Check if dependencies are installed
Write-Host "`n3. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ Dependencies are installed" -ForegroundColor Green
} else {
    Write-Host "   🔄 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
}

# Step 4: Display system status
Write-Host "`n4. System Status:" -ForegroundColor Yellow
Write-Host "   📁 Project Directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host "   🗄️  Database: MongoDB (Running)" -ForegroundColor Green
Write-Host "   🌐 API Server: Ready to start" -ForegroundColor Yellow
Write-Host "   🔐 Environment: Development Mode" -ForegroundColor Cyan

# Step 5: Show startup commands
Write-Host "`n🎯 READY TO START!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Now run ONE of these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   npm run dev     # Start backend server (development)" -ForegroundColor Yellow
Write-Host "   npm start       # Start backend server (production)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Your API will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 To test the API:" -ForegroundColor White
Write-Host "   node test-api.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 For documentation, visit: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")