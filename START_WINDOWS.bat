@echo off
cd /d %~dp0
if not exist .env.local copy .env.example .env.local >nul
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js 22.13+ first.
  pause
  exit /b 1
)
if not exist node_modules call npm install
call npm run doctor
call npm run dev
pause
