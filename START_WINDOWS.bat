@echo off
cd /d %~dp0
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22.13 or newer.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install --no-audit --no-fund
)
call npm run dev
pause
