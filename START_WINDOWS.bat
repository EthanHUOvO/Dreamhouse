@echo off
cd /d %~dp0
py -3 run_demo.py 2>nul || python run_demo.py
pause
