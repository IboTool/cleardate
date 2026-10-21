@echo off
rem Start the ClearDate app (Vite dev server on http://localhost:5173) and open it in the default browser.
rem Stop it again with stop-cleardate.bat (or close the "ClearDate server" window).
setlocal
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js / npm was not found. Install Node.js LTS from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies, first run only...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

rem Already running? Just open the browser.
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 goto open

start "ClearDate server" cmd /k "npm run dev -- --port 5173 --strictPort"

set /a tries=0
:wait
ping -n 2 127.0.0.1 >nul
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if not errorlevel 1 goto open
set /a tries+=1
if %tries% lss 45 goto wait
echo The server did not start within 45 seconds. Check the "ClearDate server" window for errors.
pause
exit /b 1

:open
start "" http://localhost:5173/
exit /b 0
