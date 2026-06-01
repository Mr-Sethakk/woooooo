@echo off
chcp 65001 >nul
title Feynman Platform Launcher

echo ============================================
echo   Feynman Platform - One Click Start
echo ============================================
echo.

echo [1/2] Starting Backend (port 3000)...
start "Feynman Backend" cmd /k "cd /d %~dp0feynman-platform-backend && node index.js"

echo [2/2] Starting Frontend (port 5173)...
start "Feynman Frontend" cmd /k "cd /d %~dp0feynman-platform-frontend && npm run dev"

echo.
echo ============================================
echo   Both services are starting!
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo   Close this window anytime (services keep running).
echo ============================================
echo.
pause
