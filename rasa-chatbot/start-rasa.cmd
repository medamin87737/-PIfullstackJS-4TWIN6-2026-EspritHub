@echo off
echo ========================================
echo Demarrage du chatbot Rasa HR
echo ========================================
echo.

echo Etape 1: Entrainement du modele...
call rasa train

if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: L'entrainement a echoue
    pause
    exit /b 1
)

echo.
echo Etape 2: Demarrage du serveur d'actions...
start "Rasa Actions Server" cmd /k "rasa run actions"

timeout /t 3 /nobreak >nul

echo.
echo Etape 3: Demarrage du serveur Rasa...
echo Le chatbot sera accessible sur http://localhost:5005
echo.
rasa run --enable-api --cors "*"

pause
