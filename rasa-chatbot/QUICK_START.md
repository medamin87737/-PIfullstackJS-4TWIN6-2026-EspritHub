# Guide de Démarrage Rapide - Chatbot HR Rasa

## 🚀 Démarrage Automatique (Recommandé)

### Option 1: Script Windows
```cmd
cd rasa-chatbot
start-rasa.cmd
```

Ce script va automatiquement :
1. Entraîner le modèle Rasa
2. Démarrer le serveur d'actions (port 5055)
3. Démarrer le serveur Rasa (port 5005)

---

## 🔧 Démarrage Manuel

### Étape 1: Entraîner le modèle
```cmd
cd rasa-chatbot
rasa train
```

### Étape 2: Démarrer le serveur d'actions (Terminal 1)
```cmd
cd rasa-chatbot
rasa run actions
```
Le serveur d'actions démarre sur le port **5055**.

### Étape 3: Démarrer le serveur Rasa (Terminal 2)
```cmd
cd rasa-chatbot
rasa run --enable-api --cors "*"
```
Le serveur Rasa démarre sur le port **5005**.

---

## ✅ Vérification

### 1. Vérifier que les serveurs sont actifs
- Actions Server: http://localhost:5055/health
- Rasa Server: http://localhost:5005

### 2. Tester avec curl
```cmd
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"sender\": \"test\", \"message\": \"Explique cette activité\", \"metadata\": {\"activity\": {\"titre\": \"Formation Python\", \"description\": \"Apprendre Python\", \"competences\": [\"Python\"], \"objectif\": \"Maîtriser Python\", \"duration\": \"5\", \"location\": \"Paris\", \"start_date\": \"01/05/2026\", \"end_date\": \"05/05/2026\"}}}"
```

### 3. Tester depuis l'interface web
1. Connectez-vous en tant qu'employé
2. Allez sur "Mes Activités"
3. Cliquez sur l'icône de chat pour une activité
4. Posez des questions !

---

## 📝 Questions Supportées

Le chatbot peut répondre aux questions suivantes :

### Questions de base
- "Explique cette activité"
- "Pourquoi je suis recommandé ?"
- "Quelles compétences vais-je développer ?"

### Questions sur les détails
- "Quelle est la durée ?"
- "Où se déroule l'activité ?"
- "C'est quand ?" / "Quelles sont les dates ?"

### Salutations
- "Bonjour"
- "Au revoir"

---

## 🐛 Dépannage

### Problème: "None" dans les réponses
**Solution**: Assurez-vous que le serveur d'actions est démarré AVANT le serveur Rasa.

### Problème: Erreur de connexion
**Solution**: Vérifiez que les deux serveurs sont actifs (ports 5055 et 5005).

### Problème: Réponses incorrectes
**Solution**: Réentraînez le modèle avec `rasa train`.

### Problème: Port déjà utilisé
**Solution**: 
```cmd
# Trouver le processus
netstat -ano | findstr :5005
netstat -ano | findstr :5055

# Tuer le processus (remplacer PID par le numéro trouvé)
taskkill /PID <PID> /F
```

---

## 📊 Architecture

```
Frontend (React)
    ↓
Backend (NestJS) :3000
    ↓
Rasa Server :5005
    ↓
Actions Server :5055
```

---

## 🔄 Workflow de Développement

1. Modifier les fichiers de configuration (nlu.yml, domain.yml, stories.yml, actions.py)
2. Réentraîner le modèle: `rasa train`
3. Redémarrer les serveurs
4. Tester les changements

---

## 📚 Fichiers Importants

- `data/nlu.yml` - Exemples d'entraînement pour les intents
- `data/stories.yml` - Flux de conversation
- `domain.yml` - Configuration des intents, actions, slots
- `actions/actions.py` - Actions personnalisées (logique métier)
- `config.yml` - Configuration du pipeline NLP
- `endpoints.yml` - Configuration des endpoints (actions server)
