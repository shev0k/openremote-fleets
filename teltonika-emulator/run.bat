@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  python run.py %*
  exit /b %errorlevel%
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 run.py %*
  exit /b %errorlevel%
)
echo Python 3.11 or newer was not found on PATH.
exit /b 1
