@echo off
chcp 65001 >nul
title Feynman Platform Stop

echo ============================================
echo   Feynman Platform - Stopping Services
echo ============================================
echo.

echo Stopping Backend (port 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Done! All services stopped.
echo ============================================
pause
