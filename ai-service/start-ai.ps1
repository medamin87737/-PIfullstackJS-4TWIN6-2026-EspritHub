param(
  [switch]$NoReload
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Ensure-Venv {
  if (-not (Test-Path ".\.venv")) {
    Write-Host "Creating virtual environment (.venv)..." -ForegroundColor Cyan
    python -m venv .venv
  }
}

function Activate-Venv {
  $venvActivate = ".\.venv\Scripts\Activate.ps1"
  if (-not (Test-Path $venvActivate)) {
    throw "Virtual environment not found or incomplete. Delete .venv and re-run."
  }
  Write-Host "Activating virtual environment..." -ForegroundColor Cyan
  . $venvActivate
}

function Ensure-Requirements {
  # Install/Update only if uvicorn not present, to avoid re-install each run
  $uvicornPath = (Get-Command uvicorn -ErrorAction SilentlyContinue)
  if (-not $uvicornPath) {
    Write-Host "Installing requirements (first time or new machine)..." -ForegroundColor Cyan
    python -m pip install --upgrade pip
    pip install -r requirements.txt
  } else {
    Write-Host "Using existing environment (no reinstall)." -ForegroundColor Green
  }
}

Ensure-Venv
Activate-Venv
Ensure-Requirements

 # Windows PowerShell n'accepte pas l'opérateur ternaire (?:). On construit donc le flag reload avec un if.
 $reloadFlag = ""
 if (-not $NoReload.IsPresent) {
   $reloadFlag = "--reload"
 }

Write-Host "Starting AI service on http://127.0.0.1:8000 ..." -ForegroundColor Green
python -m uvicorn main:app $reloadFlag --port 8000

