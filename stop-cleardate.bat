@echo off
rem Stop the ClearDate servers: the app (port 5173), the data editor (5174) and vite preview (4173).
setlocal
set found=0
for %%P in (5173 5174 4173) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    if not "%%A"=="0" (
      echo Stopping process %%A on port %%P
      taskkill /PID %%A /T /F >nul 2>&1
      set found=1
    )
  )
)
if "%found%"=="0" echo No ClearDate server was running.
ping -n 3 127.0.0.1 >nul
