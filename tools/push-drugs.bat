@echo off
setlocal
cd /d "%~dp0.."
title ClearDate - push drugs.json

where git >nul 2>nul || (echo Git is not installed or not on PATH. & goto :fail)
where npm >nul 2>nul || (echo Node.js / npm is not installed or not on PATH. & goto :fail)
if not exist node_modules (
  echo Installing dependencies...
  call npm install || goto :fail
)

echo Checking drugs.json...
call npm run validate > "%TEMP%\cleardate-validate.log" 2>&1
if errorlevel 1 (
  type "%TEMP%\cleardate-validate.log"
  echo.
  echo drugs.json has errors, so the website build would fail. Nothing was pushed.
  goto :fail
)

git diff --quiet HEAD -- public/drugs.json
if errorlevel 1 (
  git add public/drugs.json
  git commit -q -m "Update drugs.json (%date% %time:~0,5%)" -- public/drugs.json || goto :fail
  echo Committed drugs.json.
) else (
  echo drugs.json has no new changes.
)

echo Syncing with GitHub...
git ls-remote --exit-code --heads origin main >nul 2>nul
if errorlevel 1 goto :push
git pull -q --rebase --autostash origin main
if errorlevel 1 (
  git rebase --abort >nul 2>nul
  echo Could not merge the changes on GitHub with yours. Nothing was pushed.
  goto :fail
)
:push
git push -u origin HEAD:main || goto :fail

echo.
echo Pushed. The website will show the new drugs.json once Cloudflare finishes rebuilding (a minute or two).
pause
exit /b 0

:fail
echo.
pause
exit /b 1
