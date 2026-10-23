@echo off
setlocal
cd /d "%~dp0"

rem Run the PowerShell bootstrapper synchronously so startup errors remain visible.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0DreamHouseLauncher.ps1"
if errorlevel 1 (
  echo.
  echo DreamHouse failed to start. See logs\launcher-startup.log for details.
  pause
  exit /b 1
)
endlocal
