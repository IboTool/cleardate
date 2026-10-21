@echo off
rem Start the ClearDate data editor (http://127.0.0.1:5174) for reviewing public/drugs.json, and open it.
rem Stop it with stop-cleardate.bat (or close the "ClearDate editor" window), then run tools\push-drugs.bat to publish.
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
netstat -ano | findstr /R /C:":5174 .*LISTENING" >nul
if not errorlevel 1 goto open

set NO_OPEN=1
start "ClearDate editor" cmd /k "npm run editor"

set /a tries=0
:wait
ping -n 2 127.0.0.1 >nul
netstat -ano | findstr /R /C:":5174 .*LISTENING" >nul
if not errorlevel 1 goto open
set /a tries+=1
if %tries% lss 45 goto wait
echo The editor did not start within 45 seconds. Check the "ClearDate editor" window for errors.
pause
exit /b 1

:open
start "" http://127.0.0.1:5174/
exit /b 0
