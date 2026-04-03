Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Demarrage du chatbot Rasa HR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Etape 1: Entrainement du modele..." -ForegroundColor Yellow
rasa train

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: L'entrainement a echoue" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

Write-Host ""
Write-Host "Etape 2: Demarrage du serveur d'actions..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "rasa run actions"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Etape 3: Demarrage du serveur Rasa..." -ForegroundColor Yellow
Write-Host "Le chatbot sera accessible sur http://localhost:5005" -ForegroundColor Green
Write-Host ""
rasa run --enable-api --cors "*"

Read-Host "Appuyez sur Entree pour quitter"
