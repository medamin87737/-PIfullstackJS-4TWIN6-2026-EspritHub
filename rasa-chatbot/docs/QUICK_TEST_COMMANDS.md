# Commandes de Test Rapide - Rasa Checkpoint

## Démarrage Rapide

```bash
# 1. Activer l'environnement Python 3.10
pyenv activate rasa-env  # ou: conda activate rasa-env

# 2. Entraîner le modèle
cd rasa-chatbot
rasa train

# 3. Démarrer le serveur
rasa run --enable-api --cors '*'
```

## Tests Essentiels (curl)

### Test 1: Vérifier que le serveur fonctionne
```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "bonjour"}'
```
**Attendu**: Réponse de bienvenue

---

### Test 2: Intent `explain_activity`
```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Explique cette activité"}'
```
**Attendu**: Réponse avec `{titre}` et `{description}`

---

### Test 3: Intent `why_recommended`
```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Pourquoi je suis recommandé ?"}'
```
**Attendu**: Réponse avec `{score}` et `{objectif}`

---

### Test 4: Intent `skills_gained`
```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Quelles compétences vais-je développer ?"}'
```
**Attendu**: Réponse avec `{competences}`

---

### Test 5: Fallback (message non reconnu)
```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Quelle est la météo ?"}'
```
**Attendu**: Message d'aide avec les options disponibles

---

## Script de Test Complet

Créer un fichier `test_rasa.sh`:

```bash
#!/bin/bash

echo "=== Test 1: Salutation ==="
curl -s -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "bonjour"}' | jq

echo -e "\n=== Test 2: Expliquer l'activité ==="
curl -s -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Explique cette activité"}' | jq

echo -e "\n=== Test 3: Pourquoi recommandé ==="
curl -s -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Pourquoi je suis recommandé ?"}' | jq

echo -e "\n=== Test 4: Compétences ==="
curl -s -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Quelles compétences ?"}' | jq

echo -e "\n=== Test 5: Fallback ==="
curl -s -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "Quelle est la météo ?"}' | jq

echo -e "\n=== Test 6: Au revoir ==="
curl -s -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "au revoir"}' | jq
```

Rendre le script exécutable et l'exécuter:
```bash
chmod +x test_rasa.sh
./test_rasa.sh
```

**Note**: Nécessite `jq` pour formater le JSON. Installer avec: `sudo apt install jq` (Linux) ou `brew install jq` (Mac)

---

## Checklist Rapide

- [ ] Le serveur démarre sans erreur
- [ ] Test 1 (bonjour) → Réponse de bienvenue
- [ ] Test 2 (expliquer) → Contient `{titre}` et `{description}`
- [ ] Test 3 (pourquoi) → Contient `{score}` et `{objectif}`
- [ ] Test 4 (compétences) → Contient `{competences}`
- [ ] Test 5 (fallback) → Message d'aide
- [ ] Temps de réponse < 1 seconde pour chaque test

---

## Dépannage Rapide

**Serveur ne démarre pas**:
```bash
# Vérifier Python 3.10
python --version

# Réinstaller Rasa
pip install rasa
```

**Port 5005 déjà utilisé**:
```bash
# Trouver le processus
lsof -i :5005

# Tuer le processus
kill -9 <PID>
```

**Intent non reconnu**:
```bash
# Réentraîner
rasa train --force
```

---

## Prochaine Étape

Une fois tous les tests passés, passer à la **Tâche 7**: Création des DTOs backend.

Voir le guide complet: `docs/CHECKPOINT_TESTING_GUIDE.md`
