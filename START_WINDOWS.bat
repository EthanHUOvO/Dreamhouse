@echo off
cd /d %~dp0
if not exist node_modules call npm install --no-audit --no-fund
call npm run check:project
call npm run dev
pause
