@echo off
echo 🚀 Backend Authentication System Startup
echo ========================================
echo.

echo 1. Starting MongoDB...
net start MongoDB >nul 2>&1
if errorlevel 1 (
    echo    MongoDB service not found, starting manually...
    start /min mongod
    timeout /t 3 /nobreak >nul
)
echo    ✅ MongoDB is running

echo.
echo 2. Starting backend server...
echo    Your API will be available at: http://localhost:5000
echo    Press Ctrl+C to stop the server
echo.

npm run dev