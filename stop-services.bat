@echo off
REM CineFlow AI - Stop Services Script (Windows)

echo 🛑 Stopping CineFlow AI Services...

where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PM2 not found
    pause
    exit /b 1
)

pm2 stop all
echo ✅ Services stopped
pause

