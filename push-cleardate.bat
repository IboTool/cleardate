@echo off
setlocal
cd /d "%~dp0"
title ClearDate - push to GitHub

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

git add -A
git diff --cached --quiet
if errorlevel 1 (
  set "MSG="
  set /p "MSG=Commit message (press Enter for a default): "
  if not defined MSG set "MSG=Update %date% %time:~0,5%"
  call git commit -q -m "%%MSG%%" || goto :fail
) else (
  echo No new changes to commit.
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
echo Pushed. Cloudflare will rebuild the site in a minute or two.
pause
exit /b 0

:fail
echo.
pause
exit /b 1
