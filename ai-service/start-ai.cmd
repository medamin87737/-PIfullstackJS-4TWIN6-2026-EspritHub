@echo off
setlocal enabledelayedexpansion
cd /d %~dp0

if not exist ".venv" (
  echo Creating virtual environment (.venv)...
  py -3 -m venv .venv
)

if not exist ".venv\Scripts\activate.bat" (
  echo Virtual environment incomplete. Delete .venv and re-run.
  exit /b 1
)

call .venv\Scripts\activate.bat

where uvicorn >nul 2>nul
if errorlevel 1 (
  echo Installing requirements (first time only)...
  python -m pip install --upgrade pip
  pip install -r requirements.txt
) else (
  echo Using existing environment (no reinstall).
)

echo Starting AI service on http://127.0.0.1:8000 ...
python -m uvicorn main:app --reload --port 8000

endlocal
