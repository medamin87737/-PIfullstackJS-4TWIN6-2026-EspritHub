@echo off
echo ========================================
echo Test du Chatbot HR
echo ========================================
echo.

echo Test 1: Explique cette activite
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"sender\": \"test\", \"message\": \"Explique cette activite\", \"metadata\": {\"activity\": {\"titre\": \"Formation Python\", \"description\": \"Apprendre Python de A a Z\", \"competences\": [\"Python\", \"Programmation\"], \"objectif\": \"Maitriser Python\", \"score\": 92, \"duration\": \"5\", \"location\": \"Paris\", \"start_date\": \"01/05/2026\", \"end_date\": \"05/05/2026\"}}}"

echo.
echo.
echo Test 2: Quelles competences ?
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"sender\": \"test\", \"message\": \"Quelles competences vais-je developper ?\", \"metadata\": {\"activity\": {\"titre\": \"Formation Python\", \"description\": \"Apprendre Python de A a Z\", \"competences\": [\"Python\", \"Programmation\"], \"objectif\": \"Maitriser Python\", \"score\": 92, \"duration\": \"5\", \"location\": \"Paris\", \"start_date\": \"01/05/2026\", \"end_date\": \"05/05/2026\"}}}"

echo.
echo.
echo Test 3: Quelle est la duree ?
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"sender\": \"test\", \"message\": \"Quelle est la duree ?\", \"metadata\": {\"activity\": {\"titre\": \"Formation Python\", \"description\": \"Apprendre Python de A a Z\", \"competences\": [\"Python\", \"Programmation\"], \"objectif\": \"Maitriser Python\", \"score\": 92, \"duration\": \"5\", \"location\": \"Paris\", \"start_date\": \"01/05/2026\", \"end_date\": \"05/05/2026\"}}}"

echo.
echo.
pause
