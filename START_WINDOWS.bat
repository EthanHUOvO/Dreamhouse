@echo off
cd /d %~dp0
python -m http.server 8080 --bind 0.0.0.0
pause
