# Guide de Test - Checkpoint Rasa

## Vue d'Ensemble

Ce guide fournit des instructions détaillées pour tester manuellement le serveur Rasa et vérifier que tous les composants fonctionnent correctement. Ce checkpoint est essentiel avant de passer à l'intégration backend.

**Note importante**: En raison d'une incompatibilité de version Python (système: 3.11, Rasa nécessite: 3.10), les tests réels ne peuvent pas être exécutés actuellement. Ce guide servira de référence une fois que Rasa sera correctement installé avec Python 3.10.

## Prérequis

### Installation de Python 3.10

Rasa nécessite Python 3.10. Voici comment l'installer:

#### Option 1: pyenv (Recommandé)

```bash
# Installer pyenv
curl https://pyenv.run | bash

# Installer Python 3.10
pyenv install 3.10.13

# Créer un environnement virtuel pour Rasa
pyenv virtualenv 3.10.13 rasa-env

# Activer l'environnement
pyenv activate rasa-env
```

#### Option 2: Conda

```bash
# Créer un environnement avec Python 3.10
conda create -n rasa-env python=3.10

# Activer l'environnement
conda activate rasa-env
```

### Installation de Rasa

Une fois Python 3.10 activé:

```bash
cd rasa-chatbot

# Installer Rasa
pip install rasa

# Vérifier l'installation
rasa --version
```

## Étape 1: Entraînement du Modèle

Avant de tester, le modèle doit être entraîné avec les données NLU et les stories.

```bash
cd rasa-chatbot

# Entraîner le modèle
rasa train

# Sortie attendue:
# Your Rasa model is trained and saved at 'models/YYYYMMDD-HHMMSS.tar.gz'
```

**Vérifications**:
- ✅ Le modèle est créé dans le dossier `models/`
- ✅ Aucune erreur de validation n'apparaît
- ✅ Le temps d'entraînement est raisonnable (< 5 minutes)

## Étape 2: Validation de la Configuration

Valider que tous les fichiers de configuration sont corrects:

```bash
# Valider les données
rasa data validate

# Sortie attendue:
# ✓ Story structure validation
# ✓ Intents and utterances validation
# ✓ Domain validation
```

**Vérifications**:
- ✅ Aucun avertissement sur les intents manquants
- ✅ Aucun avertissement sur les utterances non utilisées
- ✅ Toutes les stories sont valides

## Étape 3: Démarrage du Serveur Rasa

Démarrer le serveur avec l'API REST activée:

```bash
# Démarrer le serveur
rasa run --enable-api --cors '*' --debug

# Sortie attendue:
# Starting Rasa server on http://localhost:5005
# Rasa server is up and running
```

**Vérifications**:
- ✅ Le serveur démarre sans erreur
- ✅ Le port 5005 est accessible
- ✅ Les logs indiquent "Rasa server is up and running"

**Note**: Gardez ce terminal ouvert. Ouvrez un nouveau terminal pour les tests suivants.

## Étape 4: Tests Manuels avec curl

### Test 1: Vérifier que le Webhook est Accessible

```bash
# Test de base - Salutation
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "bonjour"
  }'
```

**Réponse attendue**:
```json
[
  {
    "recipient_id": "test-user",
    "text": "Bonjour ! Je suis votre assistant RH. Comment puis-je vous aider avec cette activité ?"
  }
]
```

**Vérifications**:
- ✅ Code HTTP 200
- ✅ Réponse JSON valide
- ✅ Le texte correspond à `utter_greet`

---

### Test 2: Intent `explain_activity`

Tester la reconnaissance de l'intent pour expliquer une activité:

```bash
# Variation 1: Question directe
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Explique cette activité"
  }'
```

**Réponse attendue**:
```json
[
  {
    "recipient_id": "test-user",
    "text": "Cette activité s'intitule '{titre}'. {description}"
  }
]
```

**Note**: Les variables `{titre}` et `{description}` apparaîtront telles quelles car nous n'avons pas encore envoyé de contexte. C'est normal à ce stade.

```bash
# Variation 2: Question informelle
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "C'\''est quoi cette activité ?"
  }'
```

```bash
# Variation 3: Demande polie
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Peux-tu me décrire cette activité ?"
  }'
```

**Vérifications**:
- ✅ Toutes les variations déclenchent `utter_explain_activity`
- ✅ La réponse contient les placeholders `{titre}` et `{description}`
- ✅ Le temps de réponse est < 1 seconde

---

### Test 3: Intent `why_recommended`

Tester la reconnaissance de l'intent pour comprendre la recommandation:

```bash
# Variation 1: Question directe
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Pourquoi je suis recommandé ?"
  }'
```

**Réponse attendue**:
```json
[
  {
    "recipient_id": "test-user",
    "text": "Cette activité vous est recommandée avec un score de {score}%. Elle correspond à vos objectifs professionnels : {objectif}."
  }
]
```

```bash
# Variation 2: Question courte
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Pourquoi cette activité ?"
  }'
```

```bash
# Variation 3: Question informelle
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Pourquoi me suggères-tu ça ?"
  }'
```

**Vérifications**:
- ✅ Toutes les variations déclenchent `utter_why_recommended`
- ✅ La réponse contient les placeholders `{score}` et `{objectif}`
- ✅ Le temps de réponse est < 1 seconde

---

### Test 4: Intent `skills_gained`

Tester la reconnaissance de l'intent pour les compétences:

```bash
# Variation 1: Question directe
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Quelles compétences vais-je développer ?"
  }'
```

**Réponse attendue**:
```json
[
  {
    "recipient_id": "test-user",
    "text": "En participant à cette activité, vous développerez les compétences suivantes : {competences}."
  }
]
```

```bash
# Variation 2: Question courte
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Quelles sont les compétences ?"
  }'
```

```bash
# Variation 3: Question sur l'apprentissage
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Qu'\''est-ce que je vais apprendre ?"
  }'
```

**Vérifications**:
- ✅ Toutes les variations déclenchent `utter_skills_gained`
- ✅ La réponse contient le placeholder `{competences}`
- ✅ Le temps de réponse est < 1 seconde

---

### Test 5: Intent Non Reconnu (Fallback)

Tester que Rasa gère correctement les messages non compris:

```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test-user",
    "message": "Quelle est la météo aujourd'\''hui ?"
  }'
```

**Réponse attendue**:
```json
[
  {
    "recipient_id": "test-user",
    "text": "Je ne suis pas sûr de comprendre. Vous pouvez me demander d'expliquer l'activité, pourquoi elle vous est recommandée, ou quelles compétences vous allez développer."
  }
]
```

**Vérifications**:
- ✅ La réponse est `utter_default`
- ✅ Le message guide l'utilisateur vers les intents disponibles
- ✅ Aucune erreur n'est générée

---

## Étape 5: Test avec Variables Contextuelles

Pour tester que les variables sont correctement remplacées, nous devons envoyer des métadonnées avec le message. Cependant, le webhook REST standard de Rasa ne supporte pas directement les slots via metadata.

**Note**: Ce test sera effectué lors de l'intégration backend, où le backend enverra les slots via une action personnalisée ou en utilisant l'API `/conversations/{sender_id}/tracker/events`.

### Test Alternatif: Vérifier les Slots dans le Domain

```bash
# Vérifier que les slots sont définis
grep -A 5 "^slots:" rasa-chatbot/domain.yml
```

**Sortie attendue**:
```yaml
slots:
  titre:
    type: text
    mappings:
      - type: custom
  description:
    type: text
    mappings:
      - type: custom
  # ... autres slots
```

**Vérifications**:
- ✅ Les slots `titre`, `description`, `competences`, `score`, `objectif` sont définis
- ✅ Tous les slots ont `type: custom` pour permettre l'injection depuis le backend

---

## Étape 6: Test de Conversation Multi-Tours

Tester une conversation avec plusieurs échanges:

```bash
# Message 1: Salutation
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "conversation-test",
    "message": "bonjour"
  }'

# Message 2: Expliquer l'activité
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "conversation-test",
    "message": "Explique cette activité"
  }'

# Message 3: Demander les compétences
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "conversation-test",
    "message": "Quelles compétences ?"
  }'

# Message 4: Au revoir
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "conversation-test",
    "message": "au revoir"
  }'
```

**Vérifications**:
- ✅ Chaque message reçoit une réponse appropriée
- ✅ Le contexte de conversation est maintenu (même `sender`)
- ✅ La dernière réponse est `utter_goodbye`

---

## Étape 7: Vérification des Logs

Pendant les tests, vérifier les logs du serveur Rasa pour:

**Logs attendus**:
```
DEBUG    rasa.core.processor  - Received user message 'bonjour' with intent 'greet' (confidence: 0.99)
DEBUG    rasa.core.policies.ted_policy  - Predicted action 'utter_greet' with confidence 0.98
DEBUG    rasa.core.processor  - Action 'utter_greet' ended with events [...]
```

**Vérifications**:
- ✅ Les intents sont reconnus avec une confiance > 0.7
- ✅ Les actions prédites correspondent aux intents
- ✅ Aucune erreur ou exception n'apparaît

---

## Étape 8: Tests Automatisés (Optionnel)

Si vous souhaitez automatiser les tests:

```bash
# Tester les intents NLU
rasa test nlu --nlu data/nlu.yml

# Tester les stories
rasa test core --stories data/stories.yml

# Tester tout
rasa test
```

**Vérifications**:
- ✅ Tous les intents ont une précision > 80%
- ✅ Toutes les stories passent
- ✅ Aucun échec de test

---

## Checklist de Validation Complète

Avant de passer à l'intégration backend, vérifier que:

### Configuration
- [ ] Python 3.10 est installé et activé
- [ ] Rasa est installé (`rasa --version` fonctionne)
- [ ] Le modèle est entraîné (`models/*.tar.gz` existe)
- [ ] La validation des données passe (`rasa data validate`)

### Serveur
- [ ] Le serveur démarre sans erreur
- [ ] Le webhook REST est accessible sur `http://localhost:5005/webhooks/rest/webhook`
- [ ] Le serveur répond en < 1 seconde

### Intents
- [ ] `greet` est reconnu correctement
- [ ] `explain_activity` est reconnu avec toutes les variations
- [ ] `why_recommended` est reconnu avec toutes les variations
- [ ] `skills_gained` est reconnu avec toutes les variations
- [ ] `goodbye` est reconnu correctement
- [ ] Les messages non reconnus déclenchent `utter_default`

### Réponses
- [ ] `utter_greet` contient un message de bienvenue
- [ ] `utter_explain_activity` contient les placeholders `{titre}` et `{description}`
- [ ] `utter_why_recommended` contient les placeholders `{score}` et `{objectif}`
- [ ] `utter_skills_gained` contient le placeholder `{competences}`
- [ ] `utter_default` guide l'utilisateur vers les intents disponibles

### Conversation
- [ ] Les conversations multi-tours fonctionnent
- [ ] Le contexte est maintenu entre les messages
- [ ] Les logs montrent les prédictions correctes

---

## Dépannage

### Problème: Le serveur ne démarre pas

**Erreur**: `ModuleNotFoundError: No module named 'rasa'`

**Solution**:
```bash
# Vérifier que l'environnement virtuel est activé
which python  # Doit pointer vers l'environnement virtuel

# Réinstaller Rasa
pip install rasa
```

---

### Problème: Erreur de version Python

**Erreur**: `Python 3.11 is not supported. Please use Python 3.10`

**Solution**:
```bash
# Utiliser pyenv ou conda pour installer Python 3.10
pyenv install 3.10.13
pyenv local 3.10.13
```

---

### Problème: Intent non reconnu

**Erreur**: Tous les messages déclenchent `utter_default`

**Solution**:
```bash
# Réentraîner le modèle
rasa train --force

# Vérifier les exemples d'entraînement
cat data/nlu.yml
```

---

### Problème: Variables non remplacées

**Observation**: Les réponses contiennent `{titre}` au lieu de la valeur réelle

**Explication**: C'est normal à ce stade. Les variables seront remplacées par le backend lors de l'intégration. Le backend enverra les slots avec les valeurs réelles.

**Vérification**: S'assurer que les slots sont définis dans `domain.yml`:
```bash
grep -A 2 "titre:" domain.yml
```

---

### Problème: Temps de réponse lent

**Observation**: Les réponses prennent > 3 secondes

**Solution**:
```bash
# Vérifier les ressources système
top

# Réduire la taille du modèle en ajustant config.yml
# Réduire epochs dans config.yml (ex: 100 → 50)
```

---

## Prochaines Étapes

Une fois ce checkpoint validé:

1. **Intégration Backend** (Tâches 7-11):
   - Créer l'endpoint `/api/chat` dans NestJS
   - Implémenter l'enrichissement contextuel
   - Envoyer les slots à Rasa avec les valeurs réelles

2. **Intégration Frontend** (Tâches 12-17):
   - Créer le composant Chatbot React
   - Connecter au backend
   - Tester le flux complet

3. **Tests End-to-End** (Tâche 19):
   - Tester le flux complet React → NestJS → Rasa
   - Vérifier que les variables sont correctement remplacées

---

## Ressources

- [Documentation Rasa](https://rasa.com/docs/)
- [Rasa REST API](https://rasa.com/docs/rasa/pages/http-api)
- [Rasa NLU Training Data](https://rasa.com/docs/rasa/training-data-format)
- [Rasa Stories](https://rasa.com/docs/rasa/stories)

---

## Conclusion

Ce guide fournit une approche systématique pour valider que Rasa fonctionne correctement avant l'intégration. Chaque test vérifie un aspect spécifique du système, de la reconnaissance des intents à la génération des réponses.

**Important**: Conservez ce guide pour référence future et pour former d'autres développeurs sur le projet.
